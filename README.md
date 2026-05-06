# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.
https://navigate.nu.edu/d2l/home/23776

## Creating an Android App (APK) for Dummies

This project is a web application built with Next.js. It runs in a web browser. An APK is a file for native Android apps. To turn this web app into an Android app, you need to wrap it using a tool like Capacitor. Here’s a simplified, step-by-step guide on how that process generally works.

**Note:** These steps are a general guide and are not part of this project's automatic setup.

### Step 1: Get Your Web App Ready

First, you need a production-ready build of your web app.

1.  **Build the App:** In your terminal, run the build command. This creates an optimized folder of your app's files (usually in a folder named `out` or `.next`).
    ```bash
    npm run build
    ```
2.  **Export the Static Site:** For Capacitor, you need a static version of your site. You may need to modify the `build` script in `package.json` to be `next build && next export`. The output is usually created in an `out` folder.

### Step 2: Install and Set Up Capacitor

Capacitor is the tool that will wrap your web app in a native Android shell.

1.  **Install Capacitor:** In your project's terminal, run the following command:
    ```bash
    npm install @capacitor/core @capacitor/cli @capacitor/android
    ```
2.  **Initialize Capacitor:** This command sets up Capacitor in your project.
    ```bash
    npx cap init "Agenda+" "com.example.agendaplus" --web-dir=out
    ```
    *   `"Agenda+"` is your app's name.
    *   `"com.example.agendaplus"` is your app's unique ID.
    *   `--web-dir=out` tells Capacitor where your built web app is.

3.  **Add the Android Platform:** This command creates the Android project.
    ```bash
    npx cap add android
    ```

### Step 3: Set Up Android Studio

Android Studio is Google's official software for building Android apps. You'll need it to build the APK.

1.  **Download Android Studio:** Go to the [official Android Studio website](https://developer.android.com/studio) and download it.
2.  **Install It:** Follow the installation instructions for your operating system. The setup will also install the necessary Android SDKs (the tools to build Android apps).

### Step 4: Build Your APK in Android Studio

1.  **Sync Your Web App with Capacitor:** Every time you make changes to your web app, you need to rebuild it and copy the changes to the Android project.
    ```bash
    npm run build
    npx cap sync android
    ```

2.  **Open Your Project in Android Studio:**
    ```bash
    npx cap open android
    ```
    This command will automatically open Android Studio with your new native Android project loaded.

3.  **Build the APK:**
    *   In Android Studio, wait for the project to sync and load completely.
    *   In the top menu bar, go to **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
    *   Android Studio will start building your app. Once it's finished, a small notification will pop up in the bottom-right corner. Click the **"locate"** link in the notification.
    *   This will open the folder containing your APK file (usually `app-debug.apk`).

You can now copy this APK file to your Android phone and install it!
