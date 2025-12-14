module hello_blockchain::tipping {
    use std::signer;
    use std::error;
    use aptos_framework::coin::{Self};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::event;

    const E_NOT_ENOUGH_BALANCE: u64 = 1;
    const E_INVALID_AMOUNT: u64 = 2;

    
    // Modern module event
    
    #[event]
    struct TipEvent has drop, store {
        amount: u64,
        sender: address,
        receiver: address,
    }

    
    // Stats: tips sent + tips received
    
    struct TipStats has key {
        tips_sent: u64,
        tips_received: u64,
    }

    
    // Initialize TipStats for an account (internal)
    
    fun init_stats(acct: &signer) {
        let addr = signer::address_of(acct);
        if (!exists<TipStats>(addr)) {
            move_to(acct, TipStats {
                tips_sent: 0,
                tips_received: 0,
            });
        }
    }

    
    // Initialize stats for an account
    
    public entry fun initialize_stats(account: &signer) {
        init_stats(account);
    }

   
    // MAIN TIP FUNCTION
    // Takes tip_amount parameter and checks if user has enough Move
   
    public entry fun tip(
        sender: &signer,
        receiver: address,
        tip_amount: u64
    ) acquires TipStats {
        let sender_addr = signer::address_of(sender);

        // Validate tip amount
        assert!(tip_amount > 0, error::invalid_argument(E_INVALID_AMOUNT));

        // Ensure sender has stats
        init_stats(sender);

        // Check if sender has enough Move balance
        let balance = coin::balance<AptosCoin>(sender_addr);
        assert!(balance >= tip_amount, error::invalid_argument(E_NOT_ENOUGH_BALANCE));

        // Withdraw the specified tip amount from sender
        let coins = coin::withdraw<AptosCoin>(sender, tip_amount);
        
        // Add coin type parameter to deposit
        coin::deposit<AptosCoin>(receiver, coins);

        
        // Update sender stats
        
        let s_stats = borrow_global_mut<TipStats>(sender_addr);
        s_stats.tips_sent = s_stats.tips_sent + 1;

        
        // Update receiver stats if initialized
        
        if (exists<TipStats>(receiver)) {
            let r_stats = borrow_global_mut<TipStats>(receiver);
            r_stats.tips_received = r_stats.tips_received + 1;
        };

        
        // Emit modern module event
        
        let ev = TipEvent {
            amount: tip_amount,
            sender: sender_addr,
            receiver,
        };
        event::emit(ev);
    }

    
    // GET STATS - Changed to entry function for easier testing
    
    public fun get_stats(account: address): (u64, u64) acquires TipStats {
        if (!exists<TipStats>(account)) {
            return (0, 0)
        };
        let stats = borrow_global<TipStats>(account);
        (stats.tips_sent, stats.tips_received)
    }

    // Helper function to check if stats exist

    public fun stats_exist(account: address): bool {
        exists<TipStats>(account)
    }
}