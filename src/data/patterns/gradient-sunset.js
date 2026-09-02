/**
 * Színátmenet: a teljes vázlat (viewBox) felett egyetlen lineáris gradiens,
 * userSpaceOnUse egységben → a darabhatárokon automatikusan folytonos.
 */
export default {
  id: 'sunset',
  name: 'Sunset fade',
  category: 'gradient',
  type: 'gradient',
  angle: 20, // fok, 0 = balról jobbra
  stops: [
    { offset: 0, color: '#3b1d8f' },
    { offset: 0.5, color: '#e0357a' },
    { offset: 1, color: '#ffb340' },
  ],
};
