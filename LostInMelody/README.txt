NAAKRI OG MUSIC — STARTER WEBSITE
================================

WHAT THIS ZIP CONTAINS
- index.html: website layout
- style.css: responsive dark neon design
- script.js: local demo music player, search, sorting, and upload form

HOW TO OPEN IT ON WINDOWS
1. Extract the ZIP file to a folder, for example Desktop\NaakriOGMusic.
2. Open the folder.
3. Double-click index.html to open it in your web browser.
4. Click "Admin upload", fill in the title/artist/caption, select an audio file and optional thumbnail, then click "Add track to library".

IMPORTANT LIMITATION
This is a FRONT-END LOCAL DEMO, not yet a public upload website.
- Music selected in the upload form is played locally in the current browser session.
- Audio files are not uploaded to a server and will not be available to other visitors.
- After refreshing the page, re-add the audio files. Small thumbnail images and metadata may be remembered in that browser.
- The "Admin upload" button is not protected by a login yet.
- Do not publish this as a production music site until cloud storage, database access policies, and admin authentication are configured.

NEXT STEP FOR A REAL PUBLIC WEBSITE
Connect a backend such as Supabase:
1. Create a Supabase project.
2. Create a private admin authentication account.
3. Create a songs table (title, artist, caption, audio path, thumbnail path, created_at).
4. Create storage buckets for audio and cover images.
5. Configure Row Level Security and Storage policies so only authenticated admin(s) can upload/delete, while public visitors can read/play published tracks.
6. Add the Supabase client to this site using only the publishable/anon key in frontend code. NEVER place the service_role key or database password in frontend code.
7. Test upload, playback, permissions, and bandwidth limits before publishing.

FREE HOSTING
Cloudflare Pages can host static website files. A hosted website alone does not make uploaded audio public; cloud storage and secure permissions must be connected separately.
