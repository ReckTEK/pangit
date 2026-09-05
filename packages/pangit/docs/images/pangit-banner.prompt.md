# Pangit README banner

Created with the built-in image generation tool using the previous banner as the layout reference
and `pangit-logo.png` as the approved replacement logo.

Asset: [pangit-banner.png](pangit-banner.png)

Used by the repository README and package README. The standalone `pangit-logo.png` is the shared
source for the documentation site's logo and favicon; its public copy lives in
`packages/pangit-site/public/brand/`.

## Generation prompt

```text
Use case: compositing
Asset type: the live Pangit repository README banner.
Primary request: Update the existing README banner (input image 1) to use the new frying-pan mascot logo (input image 2). Render a polished wide 3:1 banner at 2304 x 768 pixels.
Input images: Image 1 is the edit target and reference for the existing cream background, wordmark typography, colors, and exact package name. Image 2 is the approved replacement logo and must be preserved faithfully when composited into the banner.
Layout: warm solid off-white / cream background. On the left, prominently feature the approved new frying-pan logo with all six little provider mascots inside, including the bouncing GitLab fox, GitHub octocat, green Gitea teacup, blue Bitbucket bucket, blue Codeberg mountain and blue Azure character. Fit the entire square mascot into roughly the left 31% of the banner, with comfortable padding on every side. All six characters, steam strokes, rim, and handle must be visible and retain their original colors and expressions. On the right, large bold clean sans-serif wordmark "PanGit", "Pan" dark navy and "Git" orange, matching the style of image 1. Under the wordmark, set "@mannsion/pangit" in crisp dark navy monospace. Vertically center the overall wordmark and subtitle next to the mascot. Use the wide composition economically, substantial readable type, balanced breathing room and no overlap between mascot and text.
Text (verbatim): "PanGit" and "@mannsion/pangit".
Constraints: Replace the obsolete git-branch P logo completely with the approved pan logo. Preserve the pan logo's particular design, poses, character count and colors as closely as possible; do not reinvent it. Keep exactly the existing two lines of text, spelled perfectly. No extra slogans, no additional icons, no frame, no watermark, no shadow behind the mascot, no kitchen scene, no background decoration. This must read as a clean project banner when reduced to typical GitHub README width.
```
