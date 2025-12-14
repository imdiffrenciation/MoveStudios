module hello_blockchain::content_hash_store {

    use std::signer;
    use std::string::String;
    use std::vector;

    //
    // Resource that holds all content hashes uploaded by the user
    //
    struct HashStore has key {
        hashes: vector<String>,
    }

    /// Error codes
    const E_ALREADY_EXISTS: u64 = 1;

    //
    // Initialize the users storage if this is their first time
    //
    fun init_store(account: &signer) {
        move_to(account, HashStore {
            hashes: vector::empty<String>(),
        });
    }

    //
    // The function user calls from the frontend
    // This stores the hash PERMANENTLY on-chain
    //
    public entry fun store_hash(account: &signer, hash: String) acquires HashStore {
        let addr = signer::address_of(account);

        // If the user does not have a store, create one
        if (!exists<HashStore>(addr)) {
            init_store(account);
        };

        // Borrow mutable reference to users store
        let store = borrow_global_mut<HashStore>(addr);

        // Prevent duplicate insertion
        let i = 0;
        while (i < vector::length(&store.hashes)) {
            let existing = vector::borrow(&store.hashes, i);
            assert!(*existing != hash, E_ALREADY_EXISTS);
            i = i + 1;
        };

        // Add new content hash to their storage
        vector::push_back(&mut store.hashes, hash);
    }

    //
    // Get all stored hashes for the user
    // Called by frontend, explorer, or backend
    //
    public fun get_hashes(addr: address): vector<String> acquires HashStore {
        borrow_global<HashStore>(addr).hashes
    }
}
