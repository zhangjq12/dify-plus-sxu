package utils

import (
	"bytes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"golang.org/x/crypto/blowfish"
	"io"
)

// PKCS#7填充
func pkcs7Padding(data []byte, blockSize int) []byte {
	padding := blockSize - len(data)%blockSize
	padtext := bytes.Repeat([]byte{byte(padding)}, padding)
	return append(data, padtext...)
}

// 去除PKCS#7填充
func pkcs7UnPadding(data []byte) []byte {
	length := len(data)
	unpadding := int(data[length-1])
	return data[:(length - unpadding)]
}

// EncryptBlowfish Blowfish加密函数
func EncryptBlowfish(plaintext []byte, key string) (string, error) {
	block, err := blowfish.NewCipher([]byte(key))
	if err != nil {
		return "", err
	}

	// 创建初始向量
	iv := make([]byte, blowfish.BlockSize)
	if _, err = io.ReadFull(rand.Reader, iv); err != nil {
		return "", err
	}

	// 对明文进行填充
	plaintext = pkcs7Padding(plaintext, blowfish.BlockSize)

	// 加密
	mode := cipher.NewCBCEncrypter(block, iv)
	ciphertext := make([]byte, len(plaintext))
	mode.CryptBlocks(ciphertext, plaintext)

	// 将IV与密文拼接
	result := make([]byte, len(iv)+len(ciphertext))
	copy(result, iv)
	copy(result[len(iv):], ciphertext)

	return base64.StdEncoding.EncodeToString(result), nil
}

// DecryptBlowfish Blowfish解密函数
func DecryptBlowfish(text string, key string) (string, error) {
	if len(text) < blowfish.BlockSize {
		return text, nil
	}
	ciphertext, err := base64.StdEncoding.DecodeString(text)
	if err != nil {
		return "", err
	}
	block, err := blowfish.NewCipher([]byte(key))
	if err != nil {
		return "", err
	}

	// 从密文中提取IV
	iv := ciphertext[:blowfish.BlockSize]
	ciphertext = ciphertext[blowfish.BlockSize:]

	// 解密
	mode := cipher.NewCBCDecrypter(block, iv)
	plaintext := make([]byte, len(ciphertext))
	mode.CryptBlocks(plaintext, ciphertext)

	// 去除填充
	plaintext = pkcs7UnPadding(plaintext)

	return string(plaintext), nil
}
