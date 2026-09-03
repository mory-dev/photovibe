/**
 * Questions people actually type into a search box when looking for a free
 * Photoshop replacement. Rendered on /photoshop-alternative and emitted as
 * FAQPage structured data from the same source.
 */
export interface FaqItem {
  q: string;
  a: string;
}

export const COMPARISON_FAQ: FaqItem[] = [
  {
    q: 'Is there a completely free alternative to Photoshop?',
    a: 'Yes. Photovibe is free and open source under the MIT licence, with no paid tier, no subscription, no trial period and no watermark. GIMP, Krita and Paint.NET are other well-established free options. Photovibe aims at the middle ground: a small, fast, layer-based editor that feels familiar to anyone who has used Photoshop.',
  },
  {
    q: 'What is the best open source Photoshop alternative for Windows?',
    a: 'GIMP is the most complete open source image editor and the right answer if you need maximum feature coverage. Krita is the strongest choice for digital painting. Photovibe is the lightest of the three: a few megabytes, no account, a familiar dark layer-based interface, and GPU compositing, aimed at everyday photo edits rather than at replacing every Photoshop feature.',
  },
  {
    q: 'Can I use Photoshop without a subscription?',
    a: 'Not the current version — Adobe sells Photoshop only through a Creative Cloud subscription. That is precisely the gap free editors fill. Photovibe has no subscription, no licence key and no account; you download an installer and use it indefinitely, including for commercial work.',
  },
  {
    q: 'Does Photovibe support layers and blend modes like Photoshop?',
    a: 'Yes. Photovibe documents are built from layers with independent opacity and thirteen blend modes — Normal, Multiply, Screen, Overlay, Soft Light, Hard Light, Colour Dodge, Colour Burn, Darken, Lighten, Difference, Exclusion and Luminosity — composited on the GPU through a WebGL2 engine. Layer masks and adjustment layers are not implemented yet.',
  },
  {
    q: 'Can Photovibe open PSD files?',
    a: 'Not yet. Photovibe opens PNG, JPEG and WebP files, and images pasted from the clipboard. PSD is a large undocumented format where partial support tends to be worse than none, so it is deliberately not shipped half-finished.',
  },
  {
    q: 'Do free photo editors upload my photos to the cloud?',
    a: 'Many browser-based ones do, because the editing happens on a server. Photovibe does not: it is a native desktop application, every edit runs on your own machine, and it works fully offline. The only network request it ever makes is an optional version check against GitHub Releases when you open the About dialog.',
  },
  {
    q: 'Is Photovibe safe to install?',
    a: 'Every Windows release is built by GitHub Actions from a public, tagged commit and Authenticode-signed with a public-trust certificate through Azure Trusted Signing, using GitHub OIDC so no long-lived signing credential exists in the repository. Each release also publishes a SHA256SUMS file so you can verify the download yourself.',
  },
  {
    q: 'Is Photovibe good enough to replace Photoshop for professional work?',
    a: 'Not for a full professional retouching workflow — it has no layer masks, adjustment layers, filters or PSD support yet. It is a capable free editor for cropping, resizing, painting, adding text, making selections and blending layers, and it is honest about the rest: the roadmap lists exactly what works and what does not.',
  },
];
