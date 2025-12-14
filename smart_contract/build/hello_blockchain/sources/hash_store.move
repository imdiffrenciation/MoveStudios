module hello_blockchain::hash_store {

    use std::signer;
    use std::string::String;

    //
    // Resource stored under each user
    //
    struct UserHash has key {
        value: String
    }

    //
    // Publish hash for the first time
    //
    public entry fun save_hash(account: &signer, h: String) {
        let addr = signer::address_of(account);

        // ensure user doesn't already have one
        assert!(!exists<UserHash>(addr), 1);

        move_to(account, UserHash { value: h });
    }

    //
    // Read the user's hash
    //
    public fun get_hash(addr: address): String acquires UserHash {
        borrow_global<UserHash>(addr).value
    }
}
