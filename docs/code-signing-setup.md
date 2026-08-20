# Code Signing Setup Guide

This document provides exact, step-by-step instructions for purchasing and
configuring code signing certificates for macOS and Windows builds.

Without code signing, users see security warnings when installing Lazynext:
- **macOS**: "Lazynext cannot be opened because it is from an unidentified developer"
- **Windows**: SmartScreen "Windows protected your PC" warning

With code signing, installs are smooth and trusted.

---

## macOS: Apple Developer ID Certificate

### Cost
- **$99/year** (Apple Developer Program membership)

### Step 1: Enroll in Apple Developer Program

1. Go to https://developer.apple.com/programs/enroll/
2. Sign in with your Apple ID (or create one)
3. Choose "Individual" (for solo developers) or "Organization" (requires D-U-N-S number)
4. Pay the $99 annual fee
5. Wait for approval (usually 24-48 hours for individuals)

### Step 2: Create a Developer ID Application Certificate

1. Open **Keychain Access** on your Mac
2. Go to **Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority**
3. Fill in your email and common name, save the CSR to disk
4. Go to https://developer.apple.com/account/ios/certificate/create
5. Choose "Developer ID Application" (NOT "Mac App Distribution" — that's for App Store)
6. Upload the CSR file
7. Download the generated certificate
8. Double-click the `.cer` file to add it to Keychain Access

### Step 3: Export the Certificate as .p12

1. Open **Keychain Access**
2. Find your "Developer ID Application: Your Name (TeamID)" certificate
3. Expand it to see the private key underneath
4. Select BOTH the certificate and the private key
5. Right-click → "Export 2 items"
6. Choose `.p12` format
7. Set a password — **save this password**, you'll need it for GitHub secrets
8. Save the `.p12` file

### Step 4: Get Your Apple Team ID

1. Go to https://developer.apple.com/account#MembershipDetailsCard
2. Look for "Team ID" (a 10-character alphanumeric string like `ABC1234DEF`)

### Step 5: Create an App-Specific Password

1. Go to https://appleid.apple.com/account/manage
2. Sign in with your Apple ID
3. Under "App-Specific Passwords", click "Generate Password"
4. Label it "Lazynext Notarization"
5. Copy the generated password

### Step 6: Add GitHub Secrets

Go to https://github.com/Lazynext-Platform/Lazynext/settings/secrets/actions and add:

| Secret name | Value |
|---|---|
| `MACOS_CERTIFICATE` | Base64-encoded .p12 file (run: `base64 -i certificate.p12 \| pbcopy`) |
| `MACOS_CERTIFICATE_PWD` | The password you set for the .p12 file |
| `APPLE_ID` | Your Apple ID email address |
| `APPLE_APP_SPECIFIC_PASSWORD` | The app-specific password from Step 5 |
| `APPLE_TEAM_ID` | Your 10-character Team ID from Step 4 |

### Step 7: Trigger a New Release

The desktop workflow (`.github/workflows/desktop.yml`) already supports signing.
When these secrets are present, it will automatically:
1. Import the certificate into a temporary keychain
2. Sign the app with `electron-builder`
3. Notarize the app with Apple's notarization service
4. Staple the notarization ticket to the app

Users will then see: "Lazynext" (instead of "unidentified developer") when opening the app.

---

## Windows: Code Signing Certificate

### Cost
- **~$200-400/year** (varies by provider)

### Provider Options

| Provider | Price | Notes |
|---|---|---|
| **DigiCert** | ~$399/yr | Most trusted, fast issuance |
| **Sectigo (formerly Comodo)** | ~$200/yr | Cheaper, slower issuance |
| **Certum** | ~$150/yr | Budget option, EU-based |
| **Azure Key Vault** | ~$1-3/mo + Azure subscription | Cloud-managed, most secure |

### Step 1: Purchase the Certificate

1. Go to your chosen provider's website
2. Purchase an "OV Code Signing Certificate" (Organization Validation)
   - EV certificates cost more but provide immediate SmartScreen reputation
   - OV certificates work but need reputation buildup (a few hundred downloads)
3. Complete the validation process (business verification for OV, or personal identity)
4. Receive your certificate (usually as a `.pfx` file or via USB token for EV)

### Step 2: Export as .pfx (if not already)

If you received the certificate in another format:
1. Open **certmgr.msc** on Windows (or use OpenSSL on any platform)
2. Find your code signing certificate
3. Right-click → All Tasks → Export
4. Choose "Yes, export the private key"
5. Choose `.pfx` format
6. Set a password
7. Save the file

### Step 3: Add GitHub Secrets

Go to https://github.com/Lazynext-Platform/Lazynext/settings/secrets/actions and add:

| Secret name | Value |
|---|---|
| `WINDOWS_CERTIFICATE` | Base64-encoded .pfx file (run: `base64 -i certificate.pfx \| pbcopy`) |
| `WINDOWS_CERTIFICATE_PWD` | The password for the .pfx file |

### Step 4: Update the Desktop Workflow

The Windows signing logic needs to be added to `.github/workflows/desktop.yml`.
The macOS signing section is already there as a template. Add a similar block
for Windows in the Windows build job:

```yaml
- name: Import Windows signing certificate
  if: runner.os == 'Windows' && env.WINDOWS_CERTIFICATE != ''
  shell: pwsh
  env:
    WINDOWS_CERTIFICATE: ${{ secrets.WINDOWS_CERTIFICATE }}
    WINDOWS_CERTIFICATE_PWD: ${{ secrets.WINDOWS_CERTIFICATE_PWD }}
  run: |
    [System.Convert]::FromBase64String($env:WINDOWS_CERTIFICATE) | Set-Content -Path certificate.pfx -AsByteStream
    $pwd = ConvertTo-SecureString -String $env:WINDOWS_CERTIFICATE_PWD -Force -AsPlainText
    Import-PfxCertificate -FilePath certificate.pfx -CertStoreLocation Cert:\CurrentUser\My -Password $pwd
```

Then add signing env vars to the electron-builder step:
```yaml
env:
  CSC_LINK: certificate.pfx
  CSC_KEY_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PWD }}
```

### Step 5: Trigger a New Release

With the certificate and secrets in place, Windows builds will be signed.
Users will see "Lazynext" as the verified publisher instead of "Unknown Publisher".

Note: SmartScreen reputation builds over time. For the first few hundred downloads,
some users may still see a SmartScreen prompt. This is normal for new certificates.
EV certificates bypass this entirely but cost more.

---

## Summary

| Platform | Cost | What it fixes | Workflow ready? |
|---|---|---|---|
| macOS | $99/yr | "Unidentified developer" warning | Yes — just add secrets |
| Windows | $150-400/yr | SmartScreen "Unknown Publisher" warning | Needs cert import step added |

Both are one-time annual costs that dramatically improve the user experience.
