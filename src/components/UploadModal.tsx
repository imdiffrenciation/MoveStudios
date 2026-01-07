import { useState, useRef } from 'react';
import { X, Upload, Video, Image as ImageIcon, XCircle, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { generateContentHash } from '@/hooks/useContentHash';
import { resizeAndConvertToWebP } from '@/lib/imageUtils';
import { embedWatermark, generateImageFingerprint, extractWatermark, checkForStolenContent } from '@/lib/steganography';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: () => void;
}

const UploadModal = ({ isOpen, onClose, onUpload }: UploadModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [moderationStatus, setModerationStatus] = useState<'idle' | 'checking' | 'safe' | 'unsafe'>('idle');
  const [moderationReason, setModerationReason] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFile: File) => {
    // Only allow images and videos
    const isImage = selectedFile.type.startsWith('image/');
    const isVideo = selectedFile.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast({
        title: 'Invalid file type',
        description: 'Only images and videos are allowed.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'File size must be less than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    if (isVideo && !['video/mp4', 'video/webm', 'video/quicktime'].includes(selectedFile.type)) {
      toast({
        title: 'Unsupported video format',
        description: 'Please upload MP4, WebM, or MOV videos.',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setModerationStatus('idle');
    setModerationReason('');

    // Run AI moderation for images
    if (isImage) {
      setModerationStatus('checking');
      try {
        // Convert file to base64 for moderation
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          
          const { data, error } = await supabase.functions.invoke('moderate-content', {
            body: { imageUrl: base64 }
          });

          if (error) {
            console.error('Moderation error:', error);
            setModerationStatus('safe'); // Allow on error
            return;
          }

          if (data?.safe === false) {
            setModerationStatus('unsafe');
            setModerationReason(data.reason || 'Content flagged as inappropriate');
          } else {
            setModerationStatus('safe');
          }
        };
        reader.readAsDataURL(selectedFile);
      } catch (error) {
        console.error('Moderation check failed:', error);
        setModerationStatus('safe'); // Allow on error
      }
    } else {
      // For videos, skip moderation for now (could add frame extraction later)
      setModerationStatus('safe');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || !user) return;

    // Block upload if content is flagged
    if (moderationStatus === 'unsafe') {
      toast({
        title: 'Content not allowed',
        description: moderationReason || 'This content violates our community guidelines.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    
    try {
      let processedFile: File;
      let fingerprint: string | null = null;
      
      // For images: resize, embed watermark, and generate fingerprint
      if (file.type.startsWith('image/')) {
        // First convert to WebP for optimization
        const optimizedFile = await resizeAndConvertToWebP(file, 2048, 0.85);
        console.log(`Optimized: ${file.name} (${(file.size / 1024).toFixed(1)}KB) → ${optimizedFile.name} (${(optimizedFile.size / 1024).toFixed(1)}KB)`);

        // Embed invisible watermark with user ID
        const watermarkedBlob = await embedWatermark(optimizedFile, user.id);
        processedFile = new File([watermarkedBlob], optimizedFile.name.replace('.webp', '.png'), { type: 'image/png' });
        console.log('Embedded watermark with user ID:', user.id);

        // Generate fingerprint for stolen content detection
        fingerprint = await generateImageFingerprint(optimizedFile);
        console.log('Generated fingerprint:', fingerprint.substring(0, 32) + '...');
      } else {
        processedFile = file;
      }

      // Generate content hash for protection
      const contentHash = await generateContentHash(processedFile);
      console.log('Generated content hash:', contentHash);

      // Check for stolen content using watermark extraction + fingerprint similarity
      let isStolenContent = false;
      let originalCreatorUsername: string | null = null;
      let originalMediaId: string | null = null;

      if (fingerprint) {
        // First, try to extract watermark from the uploaded file (detects direct copies)
        const watermarkData = await extractWatermark(URL.createObjectURL(processedFile));
        
        if (watermarkData && watermarkData.userId !== user.id) {
          // This image has a watermark from another user!
          const { data: originalCreator } = await (supabase as any)
            .from('profiles')
            .select('username')
            .eq('id', watermarkData.userId)
            .single();

          isStolenContent = true;
          originalCreatorUsername = originalCreator?.username || 'another creator';
          
          // Find the original media
          const { data: originalMedia } = await (supabase as any)
            .from('media')
            .select('id')
            .eq('user_id', watermarkData.userId)
            .limit(1)
            .maybeSingle();
          
          originalMediaId = originalMedia?.id || null;
        }

        // Also check fingerprint similarity for edited/screenshot copies
        if (!isStolenContent) {
          const { data: existingMedia } = await (supabase as any)
            .from('media')
            .select('id, user_id, fingerprint')
            .not('fingerprint', 'is', null)
            .not('user_id', 'eq', user.id)
            .limit(200);

          if (existingMedia && existingMedia.length > 0) {
            const stolenCheck = await checkForStolenContent(
              fingerprint,
              existingMedia,
              user.id,
              85 // 85% similarity threshold
            );

            if (stolenCheck.isStolen && stolenCheck.originalUserId) {
              const { data: originalCreator } = await (supabase as any)
                .from('profiles')
                .select('username')
                .eq('id', stolenCheck.originalUserId)
                .single();

              isStolenContent = true;
              originalCreatorUsername = originalCreator?.username || 'another creator';
              originalMediaId = stolenCheck.originalId || null;

              console.log(`Detected stolen content: ${stolenCheck.similarity}% similar to original`);
            }
          }
        }

        if (isStolenContent) {
          toast({
            title: '🚫 Upload blocked - Content theft detected',
            description: (
              <span>
                This content belongs to <strong>@{originalCreatorUsername}</strong>. 
                You cannot upload content created by others.
              </span>
            ),
            variant: 'destructive',
          });
          setIsUploading(false);
          return; // Block the upload entirely
        }
      }

      // Upload file to storage
      const fileExt = processedFile.type.startsWith('video/') ? 'mp4' : 'png';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('media')
        .upload(fileName, processedFile, {
          contentType: processedFile.type,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      // Insert media record with content hash and fingerprint
      const { error: insertError } = await (supabase as any)
        .from('media')
        .insert({
          user_id: user.id,
          type: processedFile.type.startsWith('video/') ? 'video' : 'image',
          url: publicUrl,
          title: title.trim(),
          description: description.trim() || null,
          tags: tags.length > 0 ? tags : null,
          content_hash: contentHash,
          fingerprint,
          is_protected: false,
          is_flagged_stolen: false,
          original_media_id: null,
          moderation_status: 'approved',
        });

      if (insertError) throw insertError;

      toast({
        title: 'Upload successful!',
        description: (
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>Content watermarked & fingerprinted for protection!</span>
          </div>
        ),
      });

      onUpload();
      handleClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview('');
    setTitle('');
    setDescription('');
    setTags([]);
    setTagInput('');
    setModerationStatus('idle');
    setModerationReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Upload Content</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Share your creative work with the community
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
            >
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">Drop your file here or click to browse</p>
              <p className="text-sm text-muted-foreground">
                Supports: Images (JPG, PNG, GIF, WebP) and Videos (MP4, WebM, MOV) up to 5MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden border border-border">
              {file.type.startsWith('image/') ? (
                <img src={preview} alt="Preview" className="w-full max-h-96 object-contain bg-secondary" />
              ) : (
                <video src={preview} controls className="w-full max-h-96 bg-secondary" />
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => {
                  setFile(null);
                  setPreview('');
                }}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground">Title *</Label>
            <Input
              id="title"
              placeholder="Give your content a catchy title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-secondary border-border"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell us more about your creation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-secondary border-border resize-none"
              rows={4}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags" className="text-foreground">Tags (Max 10)</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add a tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="bg-secondary border-border"
                disabled={tags.length >= 10}
              />
              <Button type="button" onClick={addTag} disabled={tags.length >= 10}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    #{tag}
                    <XCircle
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!file || !title.trim() || isUploading}>
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UploadModal;
