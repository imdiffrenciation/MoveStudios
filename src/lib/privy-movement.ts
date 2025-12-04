// Movement wallet creation helper for Privy
export async function createMovementWallet(user: any, createWallet: any) {
  try {
    // Check if user already has an Aptos/Movement wallet
    const existingWallet = user?.linkedAccounts?.find(
      (account: any) => account.type === 'wallet' && account.chainType === 'aptos'
    );

    if (existingWallet) {
      console.log('Movement wallet already exists:', existingWallet.address);
      return existingWallet;
    }

    // Create new wallet using Privy's createWallet
    const wallet = await createWallet({ chainType: 'aptos' });
    console.log('Movement wallet created:', wallet?.address);
    return wallet;
  } catch (error) {
    console.error('Error creating Movement wallet:', error);
    // Return null instead of throwing - wallet creation is optional
    return null;
  }
}
