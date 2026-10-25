Agenda+ public preview with personal tutoring and complete coursework import.

- Imports assignments, discussions, quizzes/exams, announcements and grades, preserving instructions and course identity.
- Missing deadlines remain unverified instead of receiving invented dates.
- Personal Tutor builds diagnostics from supported Java topics and definitions in imported study notes, explains mistakes, retests missed concepts, and saves practice progress on the device.
- Optional Ollama explanations use coursework and conversation history. Text import and supported diagnostics work offline on Android and desktop.
- Desktop packages its own API backend; users do not need a source checkout or a separate Node installation.

This release workflow requires passing source/browser checks, Windows packaging/smoke checks, and Android build/test/lint/signature checks on the same commit. SHA256SUMS.txt contains installer checksums.

Preview limitations: Windows installers are unsigned unless a signing certificate is configured; Windows may show a publisher warning. Android portal automation and general AI explanations require a reachable optional backend, while desktop includes the backend. School sign-in/verification may require the user. Automated checks do not replace real-device testing, clean Windows installer testing, or app-store review. No Google Play or Microsoft Store submission is included.
