export const weddingLiveFrameCss = `
.ww-live-desktop,
.ww-live-phone {
  container-type: inline-size;
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #2a0f1d;
}
.ww-live-desktop { aspect-ratio: 16 / 10; }
.ww-live-phone { aspect-ratio: 390 / 844; }
.ww-live-desktop iframe,
.ww-live-phone iframe {
  position: absolute;
  top: 0;
  left: 0;
  border: 0;
  background: transparent;
  transform-origin: top left;
}
.ww-live-desktop iframe {
  width: 1280px;
  height: 800px;
  transform: scale(var(--ww-scale, 0.4));
}
.ww-live-phone iframe {
  width: 390px;
  height: 844px;
  transform: scale(var(--ww-scale, 0.36));
}
`;
