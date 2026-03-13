const video = document.querySelectorAll("display-video");

video.forEach((v) => {
  v.addEventListener("click", () => {
    if (vi.paused) {
      v.play();
    } else {
      video.pause();
    }
  });
});
