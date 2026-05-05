# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.


##for developers

<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FarmLink Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600px" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          
          <!-- Header with FarmLink Logo -->
          <tr>
            <td style="padding: 40px 32px 0 32px; text-align: center;">
              <div style="background-color: #22c55e; width: 60px; height: 60px; border-radius: 30px; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 32px; font-weight: 700;">🌾</span>
              </div>
              <h1 style="color: #1f2937; font-size: 28px; font-weight: 700; margin: 0 0 8px 0;">FarmLink</h1>
              <p style="color: #6b7280; font-size: 16px; margin: 0;">AI-Powered Farming Companion</p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 24px 32px 0 32px;">
              <div style="height: 2px; background: linear-gradient(90deg, #22c55e 0%, #86efac 100%); border-radius: 2px;"></div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h2 style="color: #1f2937; font-size: 22px; font-weight: 600; margin: 0 0 12px 0;">Verify Your Email</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 8px 0;">Hello,</p>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Thank you for joining FarmLink! Please use the verification code below to complete your registration:
              </p>
              
              <!-- OTP Code Box -->
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 16px; padding: 28px 20px; text-align: center; margin: 8px 0 24px 0; border: 1px solid #86efac;">
                <div style="font-size: 48px; font-weight: 700; letter-spacing: 12px; color: #22c55e; background-color: #ffffff; display: inline-block; padding: 16px 24px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
                  {{ .Token }}
                </div>
              </div>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 24px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0;">
                  ⏰ This code will expire in <strong>1 hour</strong>
                </p>
              </div>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; background-color: #f9fafb; border-radius: 0 0 24px 24px;">
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 24px 0;">
              <p style="color: #9ca3af; font-size: 13px; margin: 0 0 8px 0; text-align: center;">
                🌱 Grow smarter with FarmLink
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                &copy; 2025 FarmLink. All rights reserved.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0 0; text-align: center;">
                <a href="{{ .SiteURL }}" style="color: #22c55e; text-decoration: none;">Visit FarmLink</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>

##The above code is for configure Supabase to send OTP codes instead of magic links you will Replace the content with this OTP-focused template:



## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
