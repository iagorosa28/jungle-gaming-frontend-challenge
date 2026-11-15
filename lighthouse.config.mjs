export const profiles = {
  mobile: {
    extends: 'lighthouse:default',
    settings: { onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'], formFactor: 'mobile' },
  },
  desktop: {
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      formFactor: 'desktop',
      screenEmulation: { mobile: false, width: 1440, height: 1000, deviceScaleFactor: 1, disabled: false },
      throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 },
    },
  },
}
