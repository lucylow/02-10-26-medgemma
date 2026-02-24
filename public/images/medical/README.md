# Medical asset pipeline

Place production assets here. Paths are used by `src/lib/images.ts` and components (Hero, ROPGallery, ASQTimeline, ClinicalCard).

## Structure

```
medical/
├── rop/                    # Retinopathy of Prematurity (48 images)
│   ├── zone1/              # stage1.png … stage5.png, normal.png
│   ├── zone2/
│   └── zone3/
├── asq3/                   # Ages & Stages Questionnaire
│   ├── communication/      # 2mo.svg … 60mo.svg
│   ├── motor/
│   ├── cognitive/
│   ├── adaptive/
│   └── social-emotional/
├── chw/                    # Community Health Worker field photos
│   ├── field-india.jpg
│   ├── field-africa.jpg
│   └── field-latin.jpg
├── growthcharts/
│   ├── who-standards-height.svg
│   └── who-standards-weight.svg
└── ui/
    ├── loading-pulse.gif
    ├── risk-gradients.png
    └── medical-pattern.png
```

Until real assets are added, components use fallback placeholders or CSS so the UI still renders.
