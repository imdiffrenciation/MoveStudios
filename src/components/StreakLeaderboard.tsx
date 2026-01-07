import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Trophy, Zap, Medal, Crown, Star } from 'lucide-react';
import { useStreakLeaderboard } from '@/hooks/useStreakLeaderboard';
import { useAuth } from '@/hooks/useAuth';
import CreatorBadge from './CreatorBadge';

const StreakLeaderboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { myStats, leaderboard, loading } = useStreakLeaderboard();

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm text-muted-foreground font-medium">{rank}</span>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="h-32" />
        </Card>
        <Card className="animate-pulse">
          <CardContent className="h-64" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* My Stats Card */}
      {myStats && (
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Your Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold text-orange-500">
                  <Flame className="w-5 h-5" />
                  {myStats.current_streak}
                </div>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {myStats.total_points}
                </div>
                <p className="text-xs text-muted-foreground">Total Points</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {myStats.total_uploads}
                </div>
                <p className="text-xs text-muted-foreground">Uploads</p>
              </div>
            </div>
            
            {/* Streak explanation */}
            <div className="mt-4 p-3 bg-secondary/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Earn points:</strong> Upload daily (+10), Streak bonus (×streak), 
                Get likes (+2), Get comments (+3), Receive tips (+5)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Leaderboard
            <Badge variant="secondary" className="ml-auto text-xs">
              Resets in 14 days
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {leaderboard.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No creators on the leaderboard yet.</p>
              <p className="text-sm">Start uploading to earn points!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {leaderboard.map((entry, index) => {
                const isMe = user?.id === entry.user_id;
                return (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-3 p-3 hover:bg-secondary/50 cursor-pointer transition-colors ${
                      isMe ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => navigate(`/profile/${entry.user_id}`)}
                  >
                    <div className="w-6 flex justify-center">
                      {getRankIcon(index + 1)}
                    </div>
                    
                    <Avatar className="w-9 h-9">
                      <AvatarImage 
                        src={entry.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user_id}`} 
                      />
                      <AvatarFallback>
                        {entry.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-medium truncate ${isMe ? 'text-primary' : 'text-foreground'}`}>
                          {entry.username}
                        </span>
                        {entry.has_active_badge && <CreatorBadge size="sm" />}
                        {isMe && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Flame className="w-3 h-3 text-orange-500" />
                          {entry.current_streak}d
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-foreground">{entry.total_points}</div>
                      <div className="text-[10px] text-muted-foreground">pts</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StreakLeaderboard;
