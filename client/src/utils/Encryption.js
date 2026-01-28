const ENC_ALGO = {
    name: "ECDH",
    namedCurve: "P-256",
};

export const generateKeyPair = async () => {
    return await window.crypto.subtle.generateKey(
        ENC_ALGO,
        true,
        ["deriveKey", "deriveBits"]
    );
};

export const exportKey = async (key) => {
    const exported = await window.crypto.subtle.exportKey("jwk", key);
    return JSON.stringify(exported);
};

export const importKey = async (jwkStr, type = 'public') => {
    try {
        const jwk = JSON.parse(jwkStr);
        return await window.crypto.subtle.importKey(
            "jwk",
            jwk,
            ENC_ALGO,
            true,
            type === 'private' ? ["deriveKey", "deriveBits"] : []
        );
    } catch (e) {
        console.error("Import Key Error", e);
        return null;
    }
};

export const deriveSharedKey = async (privateKey, publicKey) => {
    try {
        return await window.crypto.subtle.deriveKey(
            {
                name: "ECDH",
                public: publicKey,
            },
            privateKey,
            {
                name: "AES-GCM",
                length: 256,
            },
            true,
            ["encrypt", "decrypt"]
        );
    } catch (e) {
        console.error("Derive Key Error", e);
        return null;
    }
};

export const encryptMessage = async (sharedKey, text) => {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = enc.encode(text);

    const ciphertext = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        sharedKey,
        encoded
    );

    const ivArr = Array.from(iv);
    const ctArr = Array.from(new Uint8Array(ciphertext));
    return JSON.stringify({ iv: ivArr, data: ctArr });
};

export const decryptMessage = async (sharedKey, encryptedJSON) => {
    try {
        if (!encryptedJSON || !sharedKey) return "Messages are encrypted";
        let parsed;
        try {
            parsed = JSON.parse(encryptedJSON);
        } catch {
            return encryptedJSON; // Not encrypted
        }

        const { iv, data } = parsed;
        if (!iv || !data) return encryptedJSON;

        const ivUint = new Uint8Array(iv);
        const dataUint = new Uint8Array(data);

        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: ivUint,
            },
            sharedKey,
            dataUint
        );

        const dec = new TextDecoder();
        return dec.decode(decrypted);
    } catch (e) {
        console.error(e);
        return "Error decrypting";
    }
};
