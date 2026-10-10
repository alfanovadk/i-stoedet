import Foundation
import Security

/// Minimal wrapper around the iOS Keychain for small secrets (the Eloverblik
/// refresh token). Items are generic passwords scoped to this app, readable
/// after first unlock and never synced to iCloud or included in backups to
/// other devices.
enum KeychainStore {
    static let service = "dk.alfanova.istoedet"

    private static func query(_ key: String) -> [String: Any] {
        return [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
    }

    /// Returns the stored value, or nil when the key does not exist.
    static func get(_ key: String) -> String? {
        var q = query(key)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess,
              let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    /// Stores or replaces the value. Returns false when the Keychain refuses.
    @discardableResult
    static func set(_ key: String, _ value: String) -> Bool {
        let data = Data(value.utf8)
        let attrs: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        let status = SecItemUpdate(query(key) as CFDictionary, attrs as CFDictionary)
        if status == errSecSuccess { return true }
        guard status == errSecItemNotFound else { return false }
        var add = query(key)
        attrs.forEach { add[$0.key] = $0.value }
        return SecItemAdd(add as CFDictionary, nil) == errSecSuccess
    }

    /// Deletes everything this app has stored. A Keychain without items counts as success.
    @discardableResult
    static func removeAll() -> Bool {
        let all: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service]
        let status = SecItemDelete(all as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }

    /// Deletes the value. A missing key counts as success.
    @discardableResult
    static func remove(_ key: String) -> Bool {
        let status = SecItemDelete(query(key) as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }
}
