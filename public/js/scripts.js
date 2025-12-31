document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll(".pagination a");

    links.forEach(link => {
        link.addEventListener("click", () => {
            sessionStorage.setItem("scrollY", window.scrollY);
        });
    });

    const savedScroll = sessionStorage.getItem("scrollY");
    if (savedScroll !== null) {
        window.scrollTo(0, parseInt(savedScroll, 12));
        sessionStorage.removeItem("scrollY");
    }
});