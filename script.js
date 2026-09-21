const haptic = window.WebHaptics ? new window.WebHaptics() : { trigger: () => {} };

document.addEventListener("DOMContentLoaded", () => {
  const siteSwitcher = document.querySelector(".site-switcher");
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const siteAudioToggle = document.querySelector("[data-site-audio-toggle]");
  const siteAudioProgress = document.querySelector("[data-site-audio-progress]");
  const siteAudioProgressFill = document.querySelector("[data-site-audio-progress-fill]");
  const siteAudioProgressTrack = siteAudioProgress?.querySelector(".site-switcher__progress-track") ?? null;
  const aboutToggle = document.querySelector(".site-switcher__about");
  const aboutToggleLabel = aboutToggle?.querySelector(".site-switcher__label") ?? null;
  const hero = document.querySelector(".hero");
  const heroTitle = document.querySelector(".hero__title");
  const stackBurstTrigger = document.querySelector("[data-stack-burst-trigger]");
  const skillBurstLayer = document.querySelector("[data-skill-burst]");
  const dock = document.querySelector(".dock");
  const mobileAppGrid = document.querySelector(".hero__mobile-apps");
  const switcherButtons = [...document.querySelectorAll(".site-switcher__button")];
  const staggerTexts = [...document.querySelectorAll(".words-stagger")];
  const navItems = [...document.querySelectorAll(".nav-item")];
  const viewToggles = [...document.querySelectorAll("[data-view-toggle]")];
  const projectScreen = document.querySelector("#project-screen");
  const aboutProjectPanel = document.querySelector('[data-project-panel="about"]');
  const projectPanelsByView = new Map([["about", aboutProjectPanel]]);
  const aboutTypingHost = document.querySelector("[data-about-typing]");
  const aboutTypingTemplate = document.querySelector("#about-typing-template");
  const pageTransition = document.querySelector(".page-transition");
  const pageTransitionPath = document.querySelector(".page-transition__path");
  const cursorDot = document.querySelector("[data-cursor-dot]");
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const siteAudioUrl = "https://freight.cargo.site/m/R2528609730153135348473181593543/cv-3.mp3";
  let audioContext = null;
  let audioUnlocked = false;
  let siteAudio = null;
  let siteAudioEventsBound = false;
  let aboutTypingAudio = null;
  let lastSwitcherSoundAt = 0;
  let lastDockSoundAt = 0;
  let lastDockClickIdx = 1;
  const dockClickBuffers = [null, null];
  let lastStackSoundAt = 0;
  let cursorFrame = 0;
  let cursorX = 0;
  let cursorY = 0;
  let aboutTypingTimers = [];
  let aboutResizeTimer = 0;
  const galleryResizeCallbacks = new Set();

  const configureAboutTypingAudio = (audio) => {
    audio.loop = true;
    audio.preload = "none";
    audio.volume = 0.9;
    audio.playbackRate = 2;

    if ("preservesPitch" in audio) {
      audio.preservesPitch = false;
    }
    if ("webkitPreservesPitch" in audio) {
      audio.webkitPreservesPitch = false;
    }
  };

  const getSiteAudio = () => {
    if (!(siteAudioToggle instanceof HTMLButtonElement)) {
      return null;
    }

    if (!siteAudio) {
      siteAudio = new Audio(siteAudioUrl);
      siteAudio.preload = "metadata";
      siteAudio.volume = 0.9;
    }

    return siteAudio;
  };

  const getAboutTypingAudio = () => {
    if (!aboutTypingAudio) {
      aboutTypingAudio = new Audio("./assets/audio/soft_tipping.mp3");
      configureAboutTypingAudio(aboutTypingAudio);
    }

    return aboutTypingAudio;
  };

  // Detect WebP support
  const checkWebPSupport = (() => {
    const canvas = document.createElement("canvas");
    return () => {
      try {
        return canvas.toDataURL("image/webp").indexOf("webp") === 5;
      } catch {
        return false;
      }
    };
  })();

  const supportsWebP = checkWebPSupport();

  const getOptimizedImagePath = (src) => {
    if (!supportsWebP || !src) return src;

    // Only convert PNG and JPG/JPEG to WebP
    if (/\.(png|jpe?g)$/i.test(src)) {
      const webpPath = src.replace(/\.(png|jpe?g)$/i, ".webp");
      return webpPath;
    }

    return src;
  };

  const assignDeferredSource = (element) => {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const nextSrc = element.dataset.src?.trim();
    if (!nextSrc || element.getAttribute("src") === nextSrc) {
      return false;
    }

    // Use optimized image path if available
    const optimizedSrc = element instanceof HTMLImageElement
      ? getOptimizedImagePath(nextSrc)
      : nextSrc;

    element.setAttribute("src", optimizedSrc);
    return true;
  };

  const hydrateDeferredVideo = (video) => {
    if (!(video instanceof HTMLVideoElement)) {
      return;
    }

    let didUpdateSource = false;
    const poster = video.dataset.poster?.trim();

    if (poster && video.getAttribute("poster") !== poster) {
      video.setAttribute("poster", poster);
    }

    video.querySelectorAll("source[data-src]").forEach((source) => {
      didUpdateSource = assignDeferredSource(source) || didUpdateSource;
    });

    if (didUpdateSource) {
      video.load();
    }
  };

  const hydrateDeferredMedia = (element) => {
    if (element instanceof HTMLVideoElement) {
      hydrateDeferredVideo(element);
      return;
    }

    if (
      element instanceof HTMLImageElement ||
      element instanceof HTMLIFrameElement ||
      element instanceof HTMLSourceElement
    ) {
      assignDeferredSource(element);
    }
  };

  const hydrateGallerySlideMedia = (slide) => {
    if (!(slide instanceof HTMLElement)) {
      return;
    }

    slide.querySelectorAll("[data-lazy-media]").forEach((element) => {
      hydrateDeferredMedia(element);
    });
  };

  const hasLoadedVideoSource = (video) =>
    Boolean(video.currentSrc) ||
    Boolean(video.getAttribute("src")) ||
    [...video.querySelectorAll("source")].some((source) => source.getAttribute("src"));

  const stopVideoPlayback = (video) => {
    if (!(video instanceof HTMLVideoElement)) {
      return;
    }

    if (typeof video.__autoplayRetryTimer === "number") {
      window.clearTimeout(video.__autoplayRetryTimer);
      video.__autoplayRetryTimer = 0;
    }

    video.pause();
    video.currentTime = 0;
  };

  const queueVideoAutoplayRetry = (video, delay = 180) => {
    if (!(video instanceof HTMLVideoElement)) {
      return;
    }

    if (typeof video.__autoplayRetryTimer === "number" && video.__autoplayRetryTimer) {
      window.clearTimeout(video.__autoplayRetryTimer);
    }

    video.__autoplayRetryTimer = window.setTimeout(() => {
      video.__autoplayRetryTimer = 0;
      playVideoIfReady(video, { allowRetry: false });
    }, delay);
  };

  const playVideoIfReady = (video, { allowRetry = true } = {}) => {
    if (!(video instanceof HTMLVideoElement) || !hasLoadedVideoSource(video)) {
      return;
    }

    if (video.readyState === 0) {
      video.load();
    }

    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;

    const retryPlayback = () => {
      if (!allowRetry) {
        return;
      }

      queueVideoAutoplayRetry(video, 220);
    };

    const handleCanPlay = () => {
      video.removeEventListener("loadeddata", handleCanPlay);
      video.removeEventListener("canplay", handleCanPlay);
      retryPlayback();
    };

    if (video.readyState < 2 && allowRetry) {
      video.addEventListener("loadeddata", handleCanPlay, { once: true });
      video.addEventListener("canplay", handleCanPlay, { once: true });
    }

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        retryPlayback();
      });
    }
  };

  const syncGallerySlideState = (slides, activeIndex) => {
    if (!Array.isArray(slides) || !slides.length || !slides[activeIndex]) {
      return;
    }

    slides.forEach((slide, slideIndex) => {
      if (!(slide instanceof HTMLElement)) {
        return;
      }

      const isActive = slideIndex === activeIndex;
      slide.toggleAttribute("data-gallery-active", isActive);

      if (!isActive) {
        slide.querySelectorAll("video").forEach((video) => {
          stopVideoPlayback(video);
        });
      }
    });

    const activeSlide = slides[activeIndex];
    hydrateGallerySlideMedia(activeSlide);
    activeSlide.querySelectorAll("video").forEach((video) => {
      playVideoIfReady(video);
    });
  };

  const syncPanelGalleryMedia = (panel) => {
    if (!(panel instanceof HTMLElement)) {
      return;
    }

    const galleries = new Set([
      ...panel.querySelectorAll("[data-project-gallery]"),
      ...panel.querySelectorAll(".personal-project-card__gallery"),
    ]);

    galleries.forEach((gallery) => {
      if (typeof gallery.__syncActiveMedia === "function") {
        gallery.__syncActiveMedia();
      }
    });
  };

  const hydratePanelMedia = (panel) => {
    if (!(panel instanceof HTMLElement)) {
      return;
    }

    panel.querySelectorAll("[data-lazy-media]").forEach((element) => {
      const slide = element.closest("[data-project-gallery-slide], .personal-project-card__gallery-slide");
      if (slide) {
        return;
      }

      hydrateDeferredMedia(element);
    });

    syncPanelGalleryMedia(panel);
  };

  const schedulePanelAutoplay = (panel) => {
    if (!(panel instanceof HTMLElement)) {
      return;
    }

    const autoplayDelays = [0, 180, 480, 960];

    autoplayDelays.forEach((delay) => {
      window.setTimeout(() => {
        panel.querySelectorAll("video[autoplay]").forEach((video) => {
          const slide = video.closest("[data-project-gallery-slide], .personal-project-card__gallery-slide");
          if (slide instanceof HTMLElement && !slide.hasAttribute("data-gallery-active")) {
            return;
          }

          if (video.readyState === 0 && hasLoadedVideoSource(video)) {
            video.load();
          }

          playVideoIfReady(video);
        });
      }, delay);
    });
  };

  const registerGalleryResize = (callback) => {
    galleryResizeCallbacks.add(callback);
  };

  const initCursorDot = () => {
    if (isTouch || !(cursorDot instanceof HTMLElement)) {
      return;
    }

    document.documentElement.dataset.cursor = "dot";
    document.body.dataset.cursor = "dot";

    const renderCursor = () => {
      cursorFrame = 0;
      cursorDot.style.left = `${cursorX}px`;
      cursorDot.style.top = `${cursorY}px`;
    };

    window.addEventListener("pointermove", (event) => {
      cursorX = event.clientX;
      cursorY = event.clientY;
      cursorDot.classList.add("is-visible");

      if (!cursorFrame) {
        cursorFrame = window.requestAnimationFrame(renderCursor);
      }
    });

    window.addEventListener("pointerleave", () => {
      cursorDot.classList.remove("is-visible");
      document.documentElement.removeAttribute("data-cursor");
      document.body.removeAttribute("data-cursor");
    });

    window.addEventListener("pointerenter", () => {
      document.documentElement.dataset.cursor = "dot";
      document.body.dataset.cursor = "dot";
    });
  };

  const isAboutTypingActive = () =>
    Boolean(aboutTypingHost?.classList.contains("is-typing") && !aboutTypingHost.classList.contains("is-revealed"));

  const clearAboutTyping = () => {
    aboutTypingTimers.forEach((timerId) => window.clearTimeout(timerId));
    aboutTypingTimers = [];

    if (aboutTypingAudio) {
      aboutTypingAudio.pause();
      aboutTypingAudio.currentTime = 0;
    }

    if (!aboutTypingHost) {
      return;
    }

    aboutTypingHost.classList.remove("is-typing");
    aboutTypingHost.classList.remove("is-revealed");
    aboutTypingHost.textContent = "";
  };

  const revealAboutTyping = () => {
    if (!isAboutTypingActive()) {
      return;
    }

    aboutTypingTimers.forEach((timerId) => window.clearTimeout(timerId));
    aboutTypingTimers = [];

    if (aboutTypingAudio) {
      aboutTypingAudio.pause();
      aboutTypingAudio.currentTime = 0;
    }

    if (!aboutTypingHost) {
      return;
    }

    aboutTypingHost.classList.remove("is-typing");
    aboutTypingHost.classList.add("is-revealed");
  };

  const startAboutTypingSound = async (totalDurationMs) => {
    await unlockAudio();
    const typingAudio = getAboutTypingAudio();

    if (!typingAudio) {
      return;
    }

    typingAudio.pause();
    typingAudio.currentTime = 0;
    typingAudio.play().catch(() => {});

    const stopId = window.setTimeout(() => {
      typingAudio.pause();
      typingAudio.currentTime = 0;
    }, totalDurationMs + 120);

    aboutTypingTimers.push(stopId);
  };

  const createAboutMeasureProbe = (paragraphClassName) => {
    if (!aboutTypingHost) {
      return null;
    }

    const paragraph = document.createElement("p");
    paragraph.className = paragraphClassName;
    paragraph.style.position = "absolute";
    paragraph.style.visibility = "hidden";
    paragraph.style.pointerEvents = "none";
    paragraph.style.inset = "0 auto auto -9999px";
    paragraph.style.width = `${Math.floor(aboutTypingHost.getBoundingClientRect().width)}px`;
    paragraph.style.maxWidth = "none";
    paragraph.style.margin = "0";

    const line = document.createElement("span");
    const styles = window.getComputedStyle(paragraph);
    line.style.display = "inline-block";
    line.style.whiteSpace = "nowrap";
    line.style.font = styles.font;
    line.style.letterSpacing = styles.letterSpacing;
    line.style.textTransform = styles.textTransform;

    paragraph.append(line);
    document.body.append(paragraph);
    return { paragraph, line };
  };

  const splitAboutParagraphIntoLines = (text, paragraphClassName) => {
    if (!aboutTypingHost) {
      return [];
    }

    const normalized = text.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return [];
    }

    const maxWidth = Math.floor(aboutTypingHost.getBoundingClientRect().width);
    if (!maxWidth) {
      return [normalized];
    }

    const probe = createAboutMeasureProbe(paragraphClassName);
    if (!probe) {
      return [normalized];
    }

    const words = normalized.split(" ");
    const lines = [];
    let currentLine = "";

    words.forEach((word) => {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      probe.line.textContent = candidate;

      if (currentLine && probe.line.getBoundingClientRect().width > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
        return;
      }

      currentLine = candidate;
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    probe.paragraph.remove();
    return lines;
  };

  const renderAboutTyping = () => {
    if (!aboutTypingHost || !(aboutTypingTemplate instanceof HTMLTemplateElement)) {
      return;
    }

    if (!aboutTypingHost.getBoundingClientRect().width) {
      aboutTypingTimers.push(window.setTimeout(renderAboutTyping, 60));
      return;
    }

    clearAboutTyping();
    const sourceParagraphs = [...aboutTypingTemplate.content.querySelectorAll(".about-screen__paragraph")];
    const paragraphGapMs = 280;
    let totalDurationMs = 0;

    sourceParagraphs.forEach((sourceParagraph) => {
      const paragraph = document.createElement("p");
      paragraph.className = sourceParagraph.className;
      const text = (sourceParagraph.textContent ?? "").trim();
      const lines = splitAboutParagraphIntoLines(text, sourceParagraph.className);
      aboutTypingHost.append(paragraph);

      const probe = createAboutMeasureProbe(sourceParagraph.className);

      const sourceLinks = [...sourceParagraph.querySelectorAll("a")];

      lines.forEach((lineText) => {
        const line = document.createElement("span");
        line.className = "about-screen__type-line";

        const lineLinks = sourceLinks
          .filter((a) => lineText.includes(a.textContent.trim()))
          .sort((a, b) => lineText.indexOf(a.textContent.trim()) - lineText.indexOf(b.textContent.trim()));

        if (lineLinks.length > 0) {
          let remaining = lineText;
          lineLinks.forEach((matchedLink) => {
            const linkText = matchedLink.textContent.trim();
            const idx = remaining.indexOf(linkText);
            if (idx === -1) return;
            if (idx > 0) line.append(document.createTextNode(remaining.slice(0, idx)));
            const a = document.createElement("a");
            a.href = matchedLink.href;
            if (matchedLink.target) a.target = matchedLink.target;
            if (matchedLink.rel) a.rel = matchedLink.rel;
            [...matchedLink.attributes]
              .filter((attr) => attr.name.startsWith("data-"))
              .forEach((attr) => a.setAttribute(attr.name, attr.value));
            a.textContent = linkText;
            line.append(a);
            remaining = remaining.slice(idx + linkText.length);
          });
          if (remaining) line.append(document.createTextNode(remaining));
        } else {
          line.textContent = lineText;
        }

        if (probe) {
          probe.line.textContent = lineText;
          line.style.setProperty("--target-width", `${Math.ceil(probe.line.getBoundingClientRect().width + 8)}px`);
        }

        const chars = Math.max(1, [...lineText].length);
        const duration = Math.max(0.62, chars * 0.028);
        line.style.setProperty("--chars", String(chars));
        line.style.setProperty("--duration", `${duration}s`);
        paragraph.append(line);
        totalDurationMs += duration * 1000 + 72;
      });

      probe?.paragraph.remove();
      totalDurationMs += paragraphGapMs;
    });

    if (prefersReducedMotion) {
      aboutTypingHost.classList.add("is-revealed");
      return;
    }

    aboutTypingHost.classList.add("is-typing");
    void startAboutTypingSound(totalDurationMs);

    let delay = 0.14;
    const lines = [...aboutTypingHost.querySelectorAll(".about-screen__type-line")];
    lines.forEach((line) => {
      const duration = Number.parseFloat(line.style.getPropertyValue("--duration")) || 0.8;
      const paragraph = line.parentElement;
      const isLastInParagraph = paragraph?.lastElementChild === line;

      line.style.setProperty("--delay", `${delay}s`);
      delay += duration + (isLastInParagraph ? 0.34 : 0.08);
    });

    const ensureVisibleId = window.setTimeout(() => {
      if (!aboutTypingHost.textContent?.trim()) {
        revealAboutTyping();
      }
    }, 420);

    const forceRevealId = window.setTimeout(() => {
      if (aboutTypingHost.classList.contains("is-typing")) {
        revealAboutTyping();
      }
    }, Math.ceil(delay * 1000) + 600);

    aboutTypingTimers.push(ensureVisibleId, forceRevealId);
  };

  const syncAboutTyping = (view) => {
    if (!aboutTypingHost) {
      return;
    }

    if (view === "about") {
      renderAboutTyping();
      aboutTypingTimers.push(
        window.setTimeout(() => {
          if (!aboutTypingHost.textContent?.trim()) {
            renderAboutTyping();
          }
        }, 180)
      );
      return;
    }

    clearAboutTyping();
  };

  window.addEventListener("resize", () => {
    galleryResizeCallbacks.forEach((callback) => {
      callback();
    });

    if (document.body.dataset.view !== "about") {
      return;
    }

    window.clearTimeout(aboutResizeTimer);
    aboutResizeTimer = window.setTimeout(() => {
      renderAboutTyping();
    }, 120);
  });

  document.addEventListener("pointerdown", () => {
    if (document.body.dataset.view !== "about") {
      return;
    }

    revealAboutTyping();
  });

  if (aboutTypingHost) {
    aboutTypingHost.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-view-toggle]");
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      viewToggles.find((t) => t.dataset.viewToggle === a.dataset.viewToggle)?.click();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (document.body.dataset.view !== "about" || event.code !== "Space") {
      return;
    }

    if (!isAboutTypingActive()) {
      return;
    }

    event.preventDefault();
    revealAboutTyping();
  });

  const setSiteAudioExpanded = (expanded) => {
    if (!siteSwitcher) {
      return;
    }

    siteSwitcher.classList.toggle("is-audio-expanded", expanded);
  };

  const setSiteAudioPlaying = (playing) => {
    if (!siteSwitcher || !(siteAudioToggle instanceof HTMLButtonElement)) {
      return;
    }

    siteSwitcher.classList.toggle("is-audio-playing", playing);
    siteAudioToggle.setAttribute("aria-pressed", String(playing));
    siteAudioToggle.setAttribute("aria-label", playing ? "Pause soundtrack" : "Play soundtrack");
  };

  const updateSiteAudioProgress = () => {
    if (!siteAudioProgressFill) {
      return;
    }

    if (!siteAudio) {
      siteAudioProgressFill.style.transform = "scaleX(0)";
      return;
    }

    const progress =
      Number.isFinite(siteAudio.duration) && siteAudio.duration > 0
        ? Math.min(1, Math.max(0, siteAudio.currentTime / siteAudio.duration))
        : 0;

    siteAudioProgressFill.style.transform = `scaleX(${progress})`;
  };

  const seekSiteAudio = (clientX) => {
    if (!siteAudio || !siteAudioProgressTrack) {
      return;
    }

    if (!Number.isFinite(siteAudio.duration) || siteAudio.duration <= 0) {
      return;
    }

    const bounds = siteAudioProgressTrack.getBoundingClientRect();
    if (!bounds.width) {
      return;
    }

    const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    siteAudio.currentTime = ratio * siteAudio.duration;
    updateSiteAudioProgress();
  };

  const stopSiteAudio = ({ collapse = false, reset = false } = {}) => {
    if (siteAudio) {
      siteAudio.pause();

      if (reset) {
        siteAudio.currentTime = 0;
      }
    }

    setSiteAudioPlaying(false);
    updateSiteAudioProgress();

    if (collapse) {
      setSiteAudioExpanded(false);
    }
  };

  const bindSiteAudioEvents = () => {
    const audio = getSiteAudio();

    if (!audio || siteAudioEventsBound) {
      return;
    }

    audio.addEventListener("loadedmetadata", updateSiteAudioProgress);
    audio.addEventListener("durationchange", updateSiteAudioProgress);
    audio.addEventListener("timeupdate", updateSiteAudioProgress);
    audio.addEventListener("play", () => {
      setSiteAudioExpanded(true);
      setSiteAudioPlaying(true);
    });
    audio.addEventListener("pause", () => {
      setSiteAudioPlaying(false);
    });
    audio.addEventListener("ended", () => {
      audio.currentTime = 0;
      setSiteAudioPlaying(false);
      updateSiteAudioProgress();
    });

    siteAudioEventsBound = true;
  };

  const getAudioContext = () => {
    if (audioContext) {
      return audioContext;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    audioContext = new AudioContextClass();
    return audioContext;
  };

  const unlockAudio = async () => {
    const context = getAudioContext();
    if (!context) {
      return null;
    }

    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch {
        return context;
      }
    }

    audioUnlocked = context.state === "running";
    return context;
  };

  const sfxCache = new Map();

  const getSfx = (path) => {
    if (!sfxCache.has(path)) {
      const audio = new Audio(path);
      audio.preload = "none";
      sfxCache.set(path, audio);
    }
    return sfxCache.get(path);
  };

  const playSfx = async (path, volume = 0.85) => {
    await unlockAudio();
    const audio = getSfx(path);
    if (!audio) return;
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const playHoverTone = async (type) => {
    const now = performance.now();
    const isSwitcher = type === "switcher";
    const lastPlayedAt = isSwitcher ? lastSwitcherSoundAt : lastDockSoundAt;
    const minGap = isSwitcher ? 110 : 85;

    if (now - lastPlayedAt < minGap) {
      return;
    }

    const context = await unlockAudio();
    if (!context || context.state !== "running") {
      return;
    }

    if (isSwitcher) {
      lastSwitcherSoundAt = now;
    } else {
      lastDockSoundAt = now;
    }

    if (isSwitcher) {
      const startAt = context.currentTime + 0.005;
      const gainNode = context.createGain();
      const oscillator = context.createOscillator();
      const overtone = context.createOscillator();
      const filter = context.createBiquadFilter();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(780, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(980, startAt + 0.09);

      overtone.type = "sine";
      overtone.frequency.setValueAtTime(1160, startAt);
      overtone.frequency.exponentialRampToValueAtTime(1460, startAt + 0.08);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2400, startAt);
      filter.Q.value = 0.45;

      gainNode.gain.setValueAtTime(0.0001, startAt);
      gainNode.gain.exponentialRampToValueAtTime(0.028, startAt + 0.012);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.15);

      oscillator.connect(filter);
      overtone.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start(startAt);
      overtone.start(startAt);
      oscillator.stop(startAt + 0.16);
      overtone.stop(startAt + 0.12);
    } else {
      lastDockClickIdx = 1 - lastDockClickIdx;
      const idx = lastDockClickIdx;
      const paths = ['./assets/audio/click-002.mp3', './assets/audio/click-003.mp3'];
      if (!dockClickBuffers[idx]) {
        try {
          const resp = await fetch(paths[idx]);
          const arr = await resp.arrayBuffer();
          dockClickBuffers[idx] = await context.decodeAudioData(arr);
        } catch { return; }
      }
      const buffer = dockClickBuffers[idx];
      if (!buffer) return;
      const src = context.createBufferSource();
      src.buffer = buffer;
      const gain = context.createGain();
      gain.gain.value = 0.7;
      src.connect(gain);
      gain.connect(context.destination);
      src.start();
    }
  };

  const playStackTone = async () => {
    const now = performance.now();
    if (now - lastStackSoundAt < 180) {
      return;
    }

    const context = await unlockAudio();
    if (!context || context.state !== "running") {
      return;
    }

    lastStackSoundAt = now;

    const startAt = context.currentTime + 0.006;
    const clickGain = context.createGain();
    const clickFilter = context.createBiquadFilter();
    const clickSource = context.createBufferSource();
    const clickBuffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * 0.045)), context.sampleRate);
    const clickData = clickBuffer.getChannelData(0);

    for (let index = 0; index < clickData.length; index += 1) {
      const t = index / clickData.length;
      const envelope = Math.pow(1 - t, 3.6);
      clickData[index] = (Math.random() * 2 - 1) * envelope;
    }

    clickSource.buffer = clickBuffer;
    clickFilter.type = "bandpass";
    clickFilter.frequency.setValueAtTime(1850, startAt);
    clickFilter.Q.value = 1.1;

    clickGain.gain.setValueAtTime(0.0001, startAt);
    clickGain.gain.exponentialRampToValueAtTime(0.038, startAt + 0.01);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.1);

    const bodyGain = context.createGain();
    const bodyOsc = context.createOscillator();
    bodyOsc.type = "triangle";
    bodyOsc.frequency.setValueAtTime(720, startAt);
    bodyOsc.frequency.exponentialRampToValueAtTime(420, startAt + 0.12);

    bodyGain.gain.setValueAtTime(0.0001, startAt);
    bodyGain.gain.exponentialRampToValueAtTime(0.022, startAt + 0.014);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.16);

    const sparkleGain = context.createGain();
    const sparkleOsc = context.createOscillator();
    sparkleOsc.type = "sine";
    sparkleOsc.frequency.setValueAtTime(1260, startAt + 0.008);
    sparkleOsc.frequency.exponentialRampToValueAtTime(1780, startAt + 0.11);

    sparkleGain.gain.setValueAtTime(0.0001, startAt + 0.008);
    sparkleGain.gain.exponentialRampToValueAtTime(0.014, startAt + 0.022);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.14);

    clickSource.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(context.destination);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(context.destination);

    sparkleOsc.connect(sparkleGain);
    sparkleGain.connect(context.destination);

    clickSource.start(startAt);
    bodyOsc.start(startAt);
    sparkleOsc.start(startAt + 0.008);

    clickSource.stop(startAt + 0.11);
    bodyOsc.stop(startAt + 0.17);
    sparkleOsc.stop(startAt + 0.15);
  };

  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, unlockAudio, { passive: true });
  });

  const initProjectTransition = () => {
    const PROJECT_META = Object.freeze({});
    const SHAPES = Object.freeze({
      collapsed: "M 0 100 V 100 Q 50 100 100 100 V 100 z",
      crest: "M 0 100 V 50 Q 50 0 100 50 V 100 z",
      covered: "M 0 100 V 0 Q 50 0 100 0 V 100 z",
    });
    const FILLS = Object.freeze({
      glass:     "rgba(255, 255, 255, 0.88)",
      glassDark: "rgba(18, 17, 16, 0.88)",
      white:     "#ffffff",
      tints: {},
    });

    const getGlassFill = () =>
      document.body.dataset.theme === "dark" ? FILLS.glassDark : FILLS.glass;
    const TRANSITION = Object.freeze({
      openExpand: 0.5,
      openCover: 0.5,
      whiteBlend: 0.56,
      coveredHold: 0.12,
      fadeOut: 1.1,
      closeCollapse: 0.5,
      closeReset: 0.5,
    });

    const validViews = new Set(["home", "about", ...Object.keys(PROJECT_META)]);
    let currentView = validViews.has(document.body.dataset.view) ? document.body.dataset.view : "home";
    let isAnimating = false;

    const getProjectTransitionFill = (view) => {
      const tint = FILLS.tints[view];
      if (!tint) return getGlassFill();
      return document.body.dataset.theme === "dark" ? tint.dark : tint.light;
    };

    const setOverlayFill = (mode) => {
      if (!pageTransitionPath) {
        return;
      }

      const fill = mode === "white" ? FILLS.white : getGlassFill();
      window.gsap.set(pageTransitionPath, { fill, stroke: fill });
    };

    const setOverlayShape = (shape) => {
      if (pageTransitionPath) {
        window.gsap.set(pageTransitionPath, { attr: { d: shape } });
      }
    };

    const setOverlayVisibility = (isVisible) => {
      pageTransition.classList.toggle("is-active", isVisible);
      window.gsap.set(pageTransition, { autoAlpha: isVisible ? 1 : 0 });
    };

    const resetOverlay = () => {
      setOverlayVisibility(false);
      setOverlayShape(SHAPES.collapsed);
      setOverlayFill("glass");
      if (pageTransitionPath) {
        window.gsap.set(pageTransitionPath, { autoAlpha: 1 });
      }
    };

    const syncProjectMedia = (view) => {
      projectPanelsByView.forEach((panel, panelView) => {
        if (!(panel instanceof HTMLElement) || panelView === view) {
          return;
        }

        panel.querySelectorAll("video").forEach((video) => {
          stopVideoPlayback(video);
        });

        panel.querySelectorAll('iframe[src*="vimeo.com"]').forEach((iframe) => {
          try {
            iframe.contentWindow.postMessage(
              JSON.stringify({ method: "pause" }),
              "https://player.vimeo.com"
            );
          } catch (_) {}
        });
      });

      const activePanel = projectPanelsByView.get(view);
      if (!(activePanel instanceof HTMLElement)) {
        return;
      }

      activePanel.querySelectorAll("video").forEach((video) => {
        const slide = video.closest("[data-project-gallery-slide], .personal-project-card__gallery-slide");
        if (slide instanceof HTMLElement && !slide.hasAttribute("data-gallery-active")) {
          return;
        }

        playVideoIfReady(video);
      });
    };

    const syncProjectPanels = (view) => {
      const isHome = view === "home";
      const isAbout = view === "about";
      if (projectScreen) {
        if (isHome) {
          projectScreen.removeAttribute("data-layout");
        } else {
          projectScreen.dataset.layout = isAbout ? "about" : "generic";
        }
      }

      if (aboutProjectPanel) {
        aboutProjectPanel.hidden = !isAbout;
      }

      projectPanelsByView.forEach((panel, panelView) => {
        if (!(panel instanceof HTMLElement)) {
          return;
        }

        panel.toggleAttribute("inert", panelView !== view);
      });
    };

    const syncActiveToggle = (view) => {
      viewToggles.forEach((toggle) => {
        if (!(toggle instanceof HTMLElement)) {
          return;
        }

        if (toggle.dataset.viewToggle === view && view !== "home") {
          toggle.setAttribute("aria-current", "page");
          return;
        }

        toggle.removeAttribute("aria-current");
      });

      if (aboutToggle instanceof HTMLButtonElement && aboutToggleLabel instanceof HTMLElement) {
        const isAboutView = view === "about";
        aboutToggleLabel.textContent = isAboutView ? "back" : "about";
        aboutToggle.setAttribute("aria-label", isAboutView ? "Back to home" : "Open about");
      }
    };

    const applyView = (view) => {
      if (!validViews.has(view)) {
        return;
      }

      if (projectScreen) {
        projectScreen.scrollTop = 0;
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });

      currentView = view;
      document.body.dataset.view = view;
      document.body.dataset.project = view === "home" ? "" : view;

      if (view !== "home" && view !== "about") {
        stopSiteAudio({ collapse: true });
      }

      if (projectScreen) {
        projectScreen.setAttribute("aria-hidden", String(view === "home"));
        projectScreen.dataset.project = view === "home" ? "" : view;
      }

      syncProjectPanels(view);
      hydratePanelMedia(projectPanelsByView.get(view));
      syncProjectMedia(view);
      syncAboutTyping(view);
      syncActiveToggle(view);
      const activePanel = projectPanelsByView.get(view);
      schedulePanelAutoplay(activePanel);
    };

    const resolveNextView = (targetView) => {
      if (!targetView || !validViews.has(targetView)) {
        return null;
      }

      if (targetView === "home") {
        return currentView === "home" ? null : "home";
      }

      return targetView === currentView ? "home" : targetView;
    };

    const directViewChange = (nextView) => {
      if (!nextView || nextView === currentView) {
        return;
      }

      applyView(nextView);
    };

    applyView(currentView);

    if (
      !pageTransition ||
      !pageTransitionPath ||
      typeof window.gsap === "undefined" ||
      typeof window.MorphSVGPlugin === "undefined"
    ) {
      viewToggles.forEach((toggle) => {
        toggle.addEventListener("click", (event) => {
          event.preventDefault();
          directViewChange(resolveNextView(toggle.dataset.viewToggle));
        });
      });

      window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && currentView !== "home") {
          applyView("home");
        }
      });

      return;
    }

    window.gsap.registerPlugin(window.MorphSVGPlugin);
    window.gsap.set(pageTransition, { autoAlpha: 0 });
    setOverlayShape(SHAPES.collapsed);
    setOverlayFill("glass");

    const animateOpen = (targetView) => {
      if (isAnimating || currentView === targetView || !PROJECT_META[targetView]) {
        return;
      }

      const transitionFill = getProjectTransitionFill(targetView);

      isAnimating = true;
      window.gsap.killTweensOf(pageTransition);
      window.gsap.killTweensOf(pageTransitionPath);
      setOverlayVisibility(true);
      window.gsap.set(pageTransition, { autoAlpha: 1 });
      window.gsap.set(pageTransitionPath, {
        attr: { d: SHAPES.collapsed },
        fill: transitionFill,
        stroke: transitionFill,
        autoAlpha: 1,
      });

      window.gsap
        .timeline({
          defaults: { overwrite: "auto" },
          onComplete: () => {
            resetOverlay();
            isAnimating = false;
          },
        })
        .to(pageTransitionPath, {
          duration: TRANSITION.openExpand,
          morphSVG: SHAPES.crest,
          ease: "power2.in",
        })
        .to(pageTransitionPath, {
          duration: TRANSITION.openCover,
          morphSVG: SHAPES.covered,
          ease: "power2.out",
        })
        .add(() => {
          applyView(targetView);
        })
        .add(() => {
          schedulePanelAutoplay(projectPanelsByView.get(targetView));
        })
        .to(
          pageTransition,
          {
            autoAlpha: 0,
            delay: TRANSITION.coveredHold,
            duration: TRANSITION.fadeOut,
            ease: "power1.out",
          }
        );
    };

    const animateClose = () => {
      if (isAnimating || currentView === "home") {
        return;
      }

      const closingView = currentView;
      const transitionFill = getProjectTransitionFill(closingView);

      isAnimating = true;
      applyView("home");
      setOverlayVisibility(true);
      setOverlayShape(SHAPES.covered);
      window.gsap.set(pageTransitionPath, { fill: transitionFill, stroke: transitionFill });

      window.gsap
        .timeline({
          defaults: { overwrite: "auto" },
          onComplete: () => {
            resetOverlay();
            isAnimating = false;
          },
        })
        .to(pageTransitionPath, {
          duration: TRANSITION.closeCollapse,
          morphSVG: SHAPES.crest,
          ease: "power2.in",
        })
        .to(pageTransitionPath, {
          duration: TRANSITION.closeReset,
          morphSVG: SHAPES.collapsed,
          ease: "power2.out",
        });
    };

    const transitionToView = (nextView) => {
      // Double-click bypass: if already animating to a different view, force-skip to it.
      if (isAnimating) {
        if (nextView && nextView !== currentView) {
          window.gsap.killTweensOf(pageTransitionPath);
          window.gsap.killTweensOf(pageTransition);
          isAnimating = false;
          resetOverlay();
          directViewChange(nextView);
        }
        return;
      }

      if (!nextView || nextView === currentView) {
        return;
      }

      const nextIsProject = Object.hasOwn(PROJECT_META, nextView);
      const currentIsProject = Object.hasOwn(PROJECT_META, currentView);

      if (nextView === "home") {
        if (currentIsProject) {
          haptic.trigger("light");
          animateClose();
          return;
        }

        haptic.trigger("light");
        directViewChange("home");
        return;
      }

      if (nextIsProject) {
        haptic.trigger("medium");
        animateOpen(nextView);
        return;
      }

      haptic.trigger("medium");
      directViewChange(nextView);
    };

    viewToggles.forEach((toggle) => {
      toggle.addEventListener("click", (event) => {
        event.preventDefault();

        const nextView = resolveNextView(toggle.dataset.viewToggle);
        if (!nextView) {
          return;
        }

        if (prefersReducedMotion) {
          directViewChange(nextView);
          return;
        }

        transitionToView(nextView);
      });
    });

    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || currentView === "home") {
        return;
      }

      if (prefersReducedMotion || !Object.hasOwn(PROJECT_META, currentView)) {
        haptic.trigger("light");
        applyView("home");
        return;
      }

      haptic.trigger("light");
      animateClose();
    });
  };

  const initWordsStagger = () => {
    staggerTexts.forEach((element) => {
      const text = (element.textContent ?? "").trim();
      const delay = Number(element.dataset.delay || 0);
      const stagger = Number(element.dataset.stagger || 100);
      const duration = Number(element.dataset.duration || 500);
      const words = text.split(/\s+/).filter(Boolean);

      element.setAttribute("aria-label", text);
      element.textContent = "";

      words.forEach((word, index) => {
        const span = document.createElement("span");
        span.className = "words-stagger__word";
        span.textContent = word;
        span.style.transitionDuration = `${duration}ms`;
        element.appendChild(span);

        if (prefersReducedMotion) {
          span.classList.add("is-visible");
          return;
        }

        window.setTimeout(() => {
          span.classList.add("is-visible");
        }, delay + index * stagger);
      });
    });
  };

  const initHeroSkillBurst = () => {
    if (
      !hero ||
      !(stackBurstTrigger instanceof HTMLElement) ||
      !(skillBurstLayer instanceof HTMLElement) ||
      typeof window.gsap === "undefined"
    ) {
      return;
    }

    const SKILL_LABELS = [
      "Forward deployment",
      "Enterprise integrations",
      "Applied AI",
      "Document intelligence",
      "LLM agents",
      "RAG systems",
      "Product engineering",
      "Python, Go, TypeScript",
      "AWS and infrastructure",
      "Customer workflows",
      "Robotics and mapping",
      "Zero to one delivery",
    ];

    const PALETTE = [
      { bg: "rgba(255, 224, 230, 0.86)", ink: "#8b3354", shadow: "rgba(139, 51, 84, 0.14)" },
      { bg: "rgba(228, 231, 255, 0.86)", ink: "#4650b8", shadow: "rgba(70, 80, 184, 0.16)" },
      { bg: "rgba(220, 246, 255, 0.88)", ink: "#1d6e8e", shadow: "rgba(29, 110, 142, 0.15)" },
      { bg: "rgba(232, 245, 224, 0.88)", ink: "#4b7b3a", shadow: "rgba(75, 123, 58, 0.14)" },
      { bg: "rgba(255, 238, 213, 0.9)", ink: "#94642b", shadow: "rgba(148, 100, 43, 0.14)" },
      { bg: "rgba(237, 230, 248, 0.88)", ink: "#6a4a94", shadow: "rgba(106, 74, 148, 0.15)" },
    ];

    const BURST_CONFIG = {
      fadeDuration: 0.34,
      fadeDelay: 1.28,
      settleDuration: 0.24,
      delayStep: 0.04,
      floorGap: 12,
      startScale: 0.56,
      midScale: 1,
      endScale: 0.94,
      desktop: {
        gravity: 1280,
        jitterX: 42,
        jitterY: 34,
        lanes: [
          { name: "left-hard", vx: -560, vy: -640, startRotation: -10, endRotation: -26 },
          { name: "left-soft", vx: -420, vy: -560, startRotation: -7, endRotation: -18 },
          { name: "right-soft", vx: 420, vy: -560, startRotation: 7, endRotation: 18 },
          { name: "right-hard", vx: 580, vy: -660, startRotation: 10, endRotation: 28 },
        ],
      },
      mobile: {
        gravity: 1120,
        jitterX: 28,
        jitterY: 24,
        lanes: [
          { name: "left-hard", vx: -360, vy: -520, startRotation: -10, endRotation: -24 },
          { name: "left-soft", vx: -280, vy: -470, startRotation: -7, endRotation: -16 },
          { name: "right-soft", vx: 280, vy: -470, startRotation: 7, endRotation: 16 },
          { name: "right-hard", vx: 380, vy: -530, startRotation: 10, endRotation: 24 },
        ],
      },
      mobileOrbit: {
        riseDuration: 0.44,
        floatDuration: 0.82,
        fadeDuration: 0.28,
        holdDelay: 1.68,
        delayStep: 0.028,
        driftX: 8,
        driftY: 10,
        entryScale: 0.72,
        exitScale: 0.94,
      },
    };

    const DESKTOP_ORBIT_CONFIG = {
      riseDuration: 0.72,
      floatDuration: 1.42,
      fadeDuration: 0.28,
      holdDelay: 1.88,
      delayStep: 0.052,
      driftX: 10,
      driftY: 12,
      entryScale: 0.78,
      exitScale: 0.96,
    };

    let activeBurstTimeline = null;

    const lerp = (from, to, progress) => from + (to - from) * progress;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const clearBurst = () => {
      if (activeBurstTimeline) {
        activeBurstTimeline.kill();
        activeBurstTimeline = null;
      }

      skillBurstLayer.textContent = "";
      stackBurstTrigger.classList.remove("is-bursting");
    };

    const createSkillPill = (label, index) => {
      const pill = document.createElement("span");
      const theme = PALETTE[index % PALETTE.length];
      pill.className = "hero__skill-pill";
      pill.textContent = label;
      pill.style.setProperty("--skill-pill-bg", theme.bg);
      pill.style.setProperty("--skill-pill-ink", theme.ink);
      pill.style.setProperty("--skill-pill-shadow", theme.shadow);
      return pill;
    };

    const getDesktopOrbitTargets = () => {
      const titleRect = heroTitle?.getBoundingClientRect();
      const containerRect = skillBurstLayer.getBoundingClientRect();

      if (!titleRect) {
        return [];
      }

      const left = titleRect.left - containerRect.left;
      const right = titleRect.right - containerRect.left;
      const top = titleRect.top - containerRect.top;
      const bottom = titleRect.bottom - containerRect.top;
      const centerX = left + titleRect.width / 2;

      return [
        { x: left - 216, y: top - 54, rotation: -14 },
        { x: left - 118, y: top + 4, rotation: -10 },
        { x: left - 182, y: bottom + 34, rotation: -12 },
        { x: centerX - 156, y: top - 112, rotation: -8 },
        { x: centerX - 48, y: top - 72, rotation: -3 },
        { x: centerX + 48, y: top - 72, rotation: 3 },
        { x: centerX + 156, y: top - 112, rotation: 8 },
        { x: right + 118, y: top + 4, rotation: 10 },
        { x: right + 216, y: top - 54, rotation: 14 },
        { x: right + 182, y: bottom + 34, rotation: 12 },
        { x: centerX - 122, y: bottom + 78, rotation: -6 },
        { x: centerX + 122, y: bottom + 78, rotation: 6 },
      ];
    };

    const getMobileOrbitTargets = (titleRect, containerRect) => {
      const left = titleRect.left - containerRect.left;
      const right = titleRect.right - containerRect.left;
      const top = titleRect.top - containerRect.top;
      const bottom = titleRect.bottom - containerRect.top;
      const centerX = left + titleRect.width / 2;
      const marginX = 52;
      const minX = marginX;
      const maxX = Math.max(marginX, containerRect.width - marginX);
      const minY = Math.max(110, top - 8);

      const targets = [
        { x: left - 34, y: top + 6, rotation: -12 },
        { x: right + 34, y: top + 6, rotation: 12 },
        { x: left - 54, y: top + titleRect.height * 0.42, rotation: -10 },
        { x: right + 54, y: top + titleRect.height * 0.42, rotation: 10 },
        { x: left - 28, y: bottom - 8, rotation: -8 },
        { x: right + 28, y: bottom - 8, rotation: 8 },
        { x: centerX - 114, y: top + 30, rotation: -9 },
        { x: centerX + 114, y: top + 30, rotation: 9 },
        { x: centerX - 78, y: bottom + 20, rotation: -6 },
        { x: centerX + 78, y: bottom + 20, rotation: 6 },
        { x: centerX - 34, y: bottom + 34, rotation: -3 },
        { x: centerX + 34, y: bottom + 34, rotation: 3 },
      ];

      return targets.map((target) => ({
        x: clamp(target.x, minX, maxX),
        y: Math.max(minY, target.y),
        rotation: target.rotation,
      }));
    };

    const launchBurst = () => {
      if (document.body.dataset.view !== "home") {
        return;
      }

      void playSfx('./assets/audio/maximize-006.mp3');
      clearBurst();
      window.gsap.killTweensOf(stackBurstTrigger);
      window.gsap.fromTo(
        stackBurstTrigger,
        { scale: 1, y: 0 },
        {
          keyframes: [
            { scale: 1.08, y: -2, duration: 0.14, ease: "power2.out" },
            { scale: 0.98, y: 1, duration: 0.12, ease: "power1.inOut" },
            { scale: 1, y: 0, duration: 0.18, ease: "power2.out" },
          ],
        }
      );

      const containerRect = skillBurstLayer.getBoundingClientRect();
      const triggerRect = stackBurstTrigger.getBoundingClientRect();
      const startX = triggerRect.left - containerRect.left + triggerRect.width / 2;
      const startY = triggerRect.top - containerRect.top + triggerRect.height / 2;
      const isMobileViewport = window.matchMedia("(max-width: 640px)").matches;
      const viewportConfig = isMobileViewport ? BURST_CONFIG.mobile : BURST_CONFIG.desktop;

      if (!isMobileViewport) {
        const orbitTargets = getDesktopOrbitTargets();
        const orbitConfig = DESKTOP_ORBIT_CONFIG;

        activeBurstTimeline = window.gsap.timeline({
          defaults: { overwrite: "auto" },
          onComplete: () => {
            clearBurst();
          },
        });

        SKILL_LABELS.forEach((label, index) => {
          const pill = createSkillPill(label, index);
          const target = orbitTargets[index % orbitTargets.length];
          const driftDirection = index % 2 === 0 ? -1 : 1;
          const driftX = driftDirection * (orbitConfig.driftX + (index % 3) * 2);
          const driftY = ((index % 4) - 1.5) * orbitConfig.driftY * 0.28;
          const delay = index * orbitConfig.delayStep;

          skillBurstLayer.appendChild(pill);

          window.gsap.set(pill, {
            x: startX,
            y: startY,
            xPercent: -50,
            yPercent: -50,
            scale: BURST_CONFIG.startScale,
            rotation: 0,
            opacity: 0,
          });

          activeBurstTimeline.to(
            pill,
            {
              x: target.x,
              y: target.y,
              rotation: target.rotation,
              opacity: 1,
              scale: prefersReducedMotion ? orbitConfig.exitScale : orbitConfig.entryScale,
              duration: prefersReducedMotion ? 0.01 : orbitConfig.riseDuration,
              ease: "power3.out",
            },
            delay
          );

          activeBurstTimeline.to(
            pill,
            {
              x: target.x + driftX,
              y: target.y + driftY,
              rotation: target.rotation + driftDirection * 2,
              scale: orbitConfig.exitScale,
              duration: prefersReducedMotion ? 0.01 : orbitConfig.floatDuration,
              ease: "sine.inOut",
              yoyo: true,
              repeat: 1,
            },
            delay + (prefersReducedMotion ? 0.01 : orbitConfig.riseDuration * 0.58)
          );

          activeBurstTimeline.to(
            pill,
            {
              opacity: 0,
              scale: 0.9,
              duration: prefersReducedMotion ? 0.01 : orbitConfig.fadeDuration,
              ease: "power1.out",
            },
            delay + (prefersReducedMotion ? 0.02 : orbitConfig.riseDuration + orbitConfig.holdDelay + orbitConfig.floatDuration)
          );
        });

        return;
      }

      if (isMobileViewport && heroTitle instanceof HTMLElement) {
        const titleRect = heroTitle.getBoundingClientRect();
        const orbitTargets = getMobileOrbitTargets(titleRect, containerRect);
        const orbitConfig = BURST_CONFIG.mobileOrbit;

        activeBurstTimeline = window.gsap.timeline({
          defaults: { overwrite: "auto" },
          onComplete: () => {
            clearBurst();
          },
        });

        SKILL_LABELS.forEach((label, index) => {
          const pill = createSkillPill(label, index);
          const target = orbitTargets[index % orbitTargets.length];
          const driftDirection = index % 2 === 0 ? -1 : 1;
          const driftX = driftDirection * (orbitConfig.driftX + (index % 3) * 2);
          const driftY = ((index % 4) - 1.5) * orbitConfig.driftY * 0.28;
          const delay = index * orbitConfig.delayStep;

          skillBurstLayer.appendChild(pill);

          window.gsap.set(pill, {
            x: startX,
            y: startY,
            xPercent: -50,
            yPercent: -50,
            scale: BURST_CONFIG.startScale,
            rotation: 0,
            opacity: 0,
          });

          activeBurstTimeline.to(
            pill,
            {
              x: target.x,
              y: target.y,
              rotation: target.rotation,
              opacity: 1,
              scale: prefersReducedMotion ? orbitConfig.exitScale : orbitConfig.entryScale,
              duration: prefersReducedMotion ? 0.01 : orbitConfig.riseDuration,
              ease: "power3.out",
            },
            delay
          );

          activeBurstTimeline.to(
            pill,
            {
              x: target.x + driftX,
              y: target.y + driftY,
              rotation: target.rotation + driftDirection * 2,
              scale: orbitConfig.exitScale,
              duration: prefersReducedMotion ? 0.01 : orbitConfig.floatDuration,
              ease: "sine.inOut",
              yoyo: true,
              repeat: 1,
            },
            delay + (prefersReducedMotion ? 0.01 : orbitConfig.riseDuration * 0.58)
          );

          activeBurstTimeline.to(
            pill,
            {
              opacity: 0,
              scale: 0.9,
              duration: prefersReducedMotion ? 0.01 : orbitConfig.fadeDuration,
              ease: "power1.out",
            },
            delay +
              (prefersReducedMotion ? 0.02 : orbitConfig.riseDuration + orbitConfig.holdDelay + orbitConfig.floatDuration)
          );
        });

        return;
      }

      const dockRect = dock?.getBoundingClientRect();
      const mobileAppGridRect = mobileAppGrid?.getBoundingClientRect();
      const floorAnchorRect =
        isMobileViewport && mobileAppGridRect && mobileAppGridRect.width > 0
          ? mobileAppGridRect
          : dockRect && dockRect.width > 0
            ? dockRect
            : null;
      const floorY = floorAnchorRect
        ? Math.max(startY + 72, floorAnchorRect.top - containerRect.top - BURST_CONFIG.floorGap)
        : containerRect.height - (isMobileViewport ? 42 : 56);

      activeBurstTimeline = window.gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          clearBurst();
        },
      });

      SKILL_LABELS.forEach((label, index) => {
        const pill = createSkillPill(label, index);
        skillBurstLayer.appendChild(pill);

        const lane = viewportConfig.lanes[index % viewportConfig.lanes.length];
        const cluster = Math.floor(index / viewportConfig.lanes.length);
        const direction = Math.sign(lane.vx) || 1;
        const jitterX = (Math.random() - 0.5) * viewportConfig.jitterX;
        const jitterY = (Math.random() - 0.5) * viewportConfig.jitterY;
        const vx =
          lane.vx +
          direction * cluster * (isMobileViewport ? 20 : 26) +
          jitterX +
          direction * (Math.random() - 0.5) * (isMobileViewport ? 46 : 72);
        const vy =
          lane.vy -
          cluster * (isMobileViewport ? 18 : 22) +
          jitterY +
          (Math.random() - 0.5) * (isMobileViewport ? 54 : 82);
        const gravity = viewportConfig.gravity;
        const distanceToFloor = floorY - startY;
        const discriminant = vy * vy + 2 * gravity * distanceToFloor;
        const impactTime = Math.max(0.42, (-vy + Math.sqrt(Math.max(discriminant, 0))) / gravity);
        const impactX = startX + vx * impactTime;
        const startRotation = lane.startRotation + direction * Math.random() * 3;
        const endRotation = lane.endRotation + direction * cluster * 2;
        const delay = index * BURST_CONFIG.delayStep;
        const pathState = { elapsed: 0 };

        window.gsap.set(pill, {
          x: startX,
          y: startY,
          xPercent: -50,
          yPercent: -50,
          scale: BURST_CONFIG.startScale,
          rotation: startRotation,
          opacity: 0,
        });

        activeBurstTimeline.to(
          pill,
          {
            opacity: 1,
            scale: BURST_CONFIG.midScale,
            duration: 0.18,
            ease: "power2.out",
          },
          delay
        );

        activeBurstTimeline.to(
          pathState,
          {
            elapsed: impactTime,
            duration: prefersReducedMotion ? 0.01 : impactTime,
            ease: "none",
            onUpdate: () => {
              const t = pathState.elapsed;
              const progress = Math.min(1, t / impactTime);
              const nextX = startX + vx * t;
              const nextY = startY + vy * t + 0.5 * gravity * t * t;
              const rotation = lerp(startRotation, endRotation, progress);
              const scale = progress < 0.16 ? lerp(BURST_CONFIG.startScale, BURST_CONFIG.midScale, progress / 0.16) : BURST_CONFIG.endScale;
              window.gsap.set(pill, {
                x: nextX,
                y: Math.min(nextY, floorY),
                rotation,
                scale,
              });
            },
          },
          delay
        );

        activeBurstTimeline.to(
          pill,
          {
            x: impactX,
            y: floorY,
            scaleX: 1.06,
            scaleY: 0.88,
            duration: prefersReducedMotion ? 0.01 : BURST_CONFIG.settleDuration * 0.5,
            ease: "power1.in",
            yoyo: true,
            repeat: 1,
          },
          delay + (prefersReducedMotion ? 0.01 : impactTime)
        );

        activeBurstTimeline.to(
          pill,
          {
            opacity: 0,
            duration: prefersReducedMotion ? 0.01 : BURST_CONFIG.fadeDuration,
            ease: "power1.out",
          },
          delay + (prefersReducedMotion ? 0.02 : impactTime + BURST_CONFIG.fadeDelay)
        );
      });
    };

    stackBurstTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      haptic.trigger("heavy");
      launchBurst();
    });

    stackBurstTrigger.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      haptic.trigger("heavy");
      launchBurst();
    });
  };

  const initPersonalCardGalleries = () => {
    const cardContents = [...document.querySelectorAll(".personal-project-card__content")];
    const galleryArrowIcon = `
      <svg class="case-gallery__nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M15.4881 4.43057C15.8026 4.70014 15.839 5.17361 15.5694 5.48811L9.98781 12L15.5694 18.5119C15.839 18.8264 15.8026 19.2999 15.4881 19.5695C15.1736 19.839 14.7001 19.8026 14.4306 19.4881L8.43056 12.4881C8.18981 12.2072 8.18981 11.7928 8.43056 11.5119L14.4306 4.51192C14.7001 4.19743 15.1736 4.161 15.4881 4.43057Z" fill="#FFFFFF"/>
      </svg>
    `;

    cardContents.forEach((content) => {
      if (!(content instanceof HTMLElement) || content.dataset.galleryReady === "true") {
        return;
      }

      const mediaNodes = [...content.children].filter(
        (node) => node instanceof HTMLElement && node.classList.contains("personal-project-card__media")
      );

      if (!mediaNodes.length) {
        return;
      }

      content.dataset.galleryReady = "true";

      const gallery = document.createElement("div");
      gallery.className = "case-gallery";

      const track = document.createElement("div");
      track.className = "case-gallery__track";
      gallery.append(track);

      mediaNodes.forEach((mediaNode, mediaIndex) => {
        const slide = document.createElement("div");
        slide.className = "case-gallery__slide";
        slide.dataset.gallerySlide = String(mediaIndex);
        slide.append(mediaNode);
        track.append(slide);
      });

      const slides = [...track.children];
      let activeIndex = 0;

      const syncTrackPosition = (behavior = "auto") => {
        const slideWidth = track.clientWidth;
        if (!slideWidth) {
          return;
        }

        track.scrollTo({
          left: activeIndex * slideWidth,
          behavior,
        });
      };

      const syncActiveMedia = () => {
        syncGallerySlideState(slides, activeIndex);
      };

      gallery.__syncActiveMedia = syncActiveMedia;

      const updateDots = (dots, prevButton, nextButton) => {
        dots.forEach((dot, dotIndex) => {
          dot.classList.toggle("is-active", dotIndex === activeIndex);
          dot.setAttribute("aria-pressed", String(dotIndex === activeIndex));
        });

        prevButton.disabled = activeIndex === 0;
        nextButton.disabled = activeIndex === slides.length - 1;
      };

      if (slides.length > 1) {
        const controls = document.createElement("div");
        controls.className = "case-gallery__controls";

        const prevButton = document.createElement("button");
        prevButton.type = "button";
        prevButton.className = "case-gallery__nav";
        prevButton.setAttribute("aria-label", "Previous media");
        prevButton.innerHTML = galleryArrowIcon;

        const nextButton = document.createElement("button");
        nextButton.type = "button";
        nextButton.className = "case-gallery__nav is-next";
        nextButton.setAttribute("aria-label", "Next media");
        nextButton.innerHTML = galleryArrowIcon;

        const dotsWrap = document.createElement("div");
        dotsWrap.className = "case-gallery__dots";

        const dots = slides.map((_, slideIndex) => {
          const dot = document.createElement("button");
          dot.type = "button";
          dot.className = "case-gallery__dot";
          dot.setAttribute("aria-label", `Go to media ${slideIndex + 1}`);
          dot.addEventListener("click", () => {
            haptic.trigger("selection");
            activeIndex = slideIndex;
            syncTrackPosition(prefersReducedMotion ? "auto" : "smooth");
            updateDots(dots, prevButton, nextButton);
            syncActiveMedia();
          });
          dotsWrap.append(dot);
          return dot;
        });

        prevButton.addEventListener("click", () => {
          haptic.trigger("selection");
          activeIndex = Math.max(0, activeIndex - 1);
          syncTrackPosition(prefersReducedMotion ? "auto" : "smooth");
          updateDots(dots, prevButton, nextButton);
          syncActiveMedia();
        });

        nextButton.addEventListener("click", () => {
          haptic.trigger("selection");
          activeIndex = Math.min(slides.length - 1, activeIndex + 1);
          syncTrackPosition(prefersReducedMotion ? "auto" : "smooth");
          updateDots(dots, prevButton, nextButton);
          syncActiveMedia();
        });

        track.addEventListener("scroll", () => {
          const slideWidth = Math.max(track.clientWidth, 1);
          activeIndex = Math.round(track.scrollLeft / slideWidth);
          updateDots(dots, prevButton, nextButton);
          syncActiveMedia();
        });

        track.addEventListener("keydown", (event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            prevButton.click();
          }

          if (event.key === "ArrowRight") {
            event.preventDefault();
            nextButton.click();
          }
        });

        registerGalleryResize(() => syncTrackPosition("auto"));

        controls.append(prevButton, dotsWrap, nextButton);
        gallery.append(controls);
        updateDots(dots, prevButton, nextButton);
      }

      content.append(gallery);
      syncTrackPosition("auto");

      if (!content.closest("[hidden]")) {
        syncActiveMedia();
      }
    });
  };

  const initProjectGalleries = () => {
    const galleryArrowIcon = `
      <svg class="case-gallery__nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M15.4881 4.43057C15.8026 4.70014 15.839 5.17361 15.5694 5.48811L9.98781 12L15.5694 18.5119C15.839 18.8264 15.8026 19.2999 15.4881 19.5695C15.1736 19.839 14.7001 19.8026 14.4306 19.4881L8.43056 12.4881C8.18981 12.2072 8.18981 11.7928 8.43056 11.5119L14.4306 4.51192C14.7001 4.19743 15.1736 4.161 15.4881 4.43057Z" fill="#FFFFFF"/>
      </svg>
    `;

    const galleries = [...document.querySelectorAll("[data-project-gallery]")];

    galleries.forEach((gallery) => {
      if (!(gallery instanceof HTMLElement) || gallery.dataset.galleryReady === "true") {
        return;
      }

      const track = gallery.querySelector("[data-project-gallery-track]");
      const prevButton = gallery.querySelector("[data-project-gallery-prev]");
      const nextButton = gallery.querySelector("[data-project-gallery-next]");
      const dotsWrap = gallery.querySelector("[data-project-gallery-dots]");

      if (
        !(track instanceof HTMLElement) ||
        !(prevButton instanceof HTMLButtonElement) ||
        !(nextButton instanceof HTMLButtonElement) ||
        !(dotsWrap instanceof HTMLElement)
      ) {
        return;
      }

      const slides = [...track.querySelectorAll("[data-project-gallery-slide]")];

      if (!slides.length) {
        return;
      }

      gallery.dataset.galleryReady = "true";
      prevButton.innerHTML = galleryArrowIcon;
      nextButton.innerHTML = galleryArrowIcon;

      let activeIndex = 0;

      const syncTrackPosition = (behavior = "auto") => {
        const slideWidth = track.clientWidth;
        if (!slideWidth) {
          return;
        }

        track.scrollTo({
          left: activeIndex * slideWidth,
          behavior,
        });
      };

      const syncActiveMedia = () => {
        syncGallerySlideState(slides, activeIndex);
      };

      gallery.__syncActiveMedia = syncActiveMedia;

      const updateControls = (dots) => {
        dots.forEach((dot, dotIndex) => {
          dot.classList.toggle("is-active", dotIndex === activeIndex);
          dot.setAttribute("aria-pressed", String(dotIndex === activeIndex));
        });

        prevButton.disabled = activeIndex === 0;
        nextButton.disabled = activeIndex === slides.length - 1;
      };

      if (slides.length === 1) {
        prevButton.hidden = true;
        nextButton.hidden = true;
        dotsWrap.hidden = true;
        if (!gallery.closest("[hidden]")) {
          syncActiveMedia();
        }
        return;
      }

      const dots = slides.map((_, slideIndex) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "case-gallery__dot";
        dot.setAttribute("aria-label", `Go to project ${slideIndex + 1}`);
        dot.addEventListener("click", () => {
          haptic.trigger("selection");
          activeIndex = slideIndex;
          syncTrackPosition(prefersReducedMotion ? "auto" : "smooth");
          updateControls(dots);
          syncActiveMedia();
        });
        dotsWrap.append(dot);
        return dot;
      });

      prevButton.addEventListener("click", () => {
        haptic.trigger("selection");
        activeIndex = Math.max(0, activeIndex - 1);
        syncTrackPosition(prefersReducedMotion ? "auto" : "smooth");
        updateControls(dots);
        syncActiveMedia();
      });

      nextButton.addEventListener("click", () => {
        haptic.trigger("selection");
        activeIndex = Math.min(slides.length - 1, activeIndex + 1);
        syncTrackPosition(prefersReducedMotion ? "auto" : "smooth");
        updateControls(dots);
        syncActiveMedia();
      });

      track.addEventListener("scroll", () => {
        const slideWidth = Math.max(track.clientWidth, 1);
        activeIndex = Math.round(track.scrollLeft / slideWidth);
        updateControls(dots);
        syncActiveMedia();
      });

      track.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          prevButton.click();
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          nextButton.click();
        }
      });

      registerGalleryResize(() => syncTrackPosition("auto"));
      updateControls(dots);
      syncTrackPosition("auto");

      if (!gallery.closest("[hidden]")) {
        syncActiveMedia();
      }
    });
  };

  initCursorDot();
  initWordsStagger();
  initProjectTransition();
  initHeroSkillBurst();
  initPersonalCardGalleries();
  initProjectGalleries();

  if (siteSwitcher && themeToggle instanceof HTMLButtonElement) {
    const validThemes = new Set(["light", "dark"]);

    const applyTheme = (theme) => {
      if (!validThemes.has(theme)) {
        return;
      }

      document.body.dataset.theme = theme;
      siteSwitcher.dataset.theme = theme;
      themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
    };

    const initialTheme = validThemes.has(document.body.dataset.theme) ? document.body.dataset.theme : "light";
    applyTheme(initialTheme);
    setSiteAudioExpanded(false);
    setSiteAudioPlaying(false);
    updateSiteAudioProgress();

    themeToggle.addEventListener("click", () => {
      haptic.trigger("light");
      const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
      void playSfx(nextTheme === "dark" ? './assets/audio/switch-on.mp3' : './assets/audio/switch-off.mp3');
    });

    if (siteAudioToggle instanceof HTMLButtonElement) {
      siteAudioToggle.addEventListener("click", async () => {
        setSiteAudioExpanded(true);
        await unlockAudio();
        const audio = getSiteAudio();

        if (!audio) {
          return;
        }

        bindSiteAudioEvents();

        if (!audio.paused) {
          stopSiteAudio({ collapse: true });
          haptic.trigger("light");
          return;
        }

        try {
          await audio.play();
          haptic.trigger("light");
        } catch {
          setSiteAudioPlaying(false);
          updateSiteAudioProgress();
        }
      });

      if (siteAudioProgressTrack instanceof HTMLElement) {
        siteAudioProgressTrack.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          seekSiteAudio(event.clientX);
        });
      }
    }

    if (!isTouch) {
      switcherButtons.forEach((button) => {
        button.addEventListener("mouseenter", () => playHoverTone("switcher"));
        button.addEventListener("focusin", () => playHoverTone("switcher"));
      });
    }
  }

  if (navItems.length === 0 || isTouch) {
    return;
  }

  const clearState = () => {
    navItems.forEach((item) => {
      item.classList.remove("hover", "sibling-close", "sibling-far");
    });
  };

  const activateItem = (index) => {
    clearState();

    const item = navItems[index];
    if (!item) {
      return;
    }

    item.classList.add("hover");

    const prev = navItems[index - 1];
    const next = navItems[index + 1];
    const prevFar = navItems[index - 2];
    const nextFar = navItems[index + 2];

    if (prev) prev.classList.add("sibling-close");
    if (next) next.classList.add("sibling-close");
    if (prevFar) prevFar.classList.add("sibling-far");
    if (nextFar) nextFar.classList.add("sibling-far");
  };

  navItems.forEach((item, index) => {
    item.addEventListener("mouseenter", () => {
      activateItem(index);
      void playHoverTone("dock");
    });
    item.addEventListener("mouseleave", clearState);
    item.addEventListener("focusin", () => {
      activateItem(index);
      void playHoverTone("dock");
    });
    item.addEventListener("focusout", clearState);
  });

  const AVATAR_PHRASES = [
    "Hi, there!",
    "Still here.",
    "Nice cursor.",
    "You found me.",
    "Let's do something.",
    "Hover achieved.",
    "I do pixels.",
    "Not a bot. Mostly.",
    "Let's ship something.",
    "This is intentional.",
    "Please, stop!",
    "Good hover technique."
  ];

  let avatarPhraseIndex = 0;

  const showAvatarBubble = () => {
    const bubble = document.querySelector('.avatar-bubble');
    const text = document.querySelector('.avatar-bubble__text');

    if (!bubble || !text) return;

    const phrase = AVATAR_PHRASES[avatarPhraseIndex];
    avatarPhraseIndex = (avatarPhraseIndex + 1) % AVATAR_PHRASES.length;

    text.textContent = phrase;

    void playSfx('./assets/audio/chat.mp3', 0.7);

    gsap.killTweensOf(bubble);
    gsap.killTweensOf(text);

    bubble.classList.add('is-active');

    gsap.timeline({ onComplete: () => bubble.classList.remove('is-active') })
      // Bounce in
      .fromTo(bubble,
        { opacity: 0, y: 50, scale: 0.8 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "elastic.out" },
        0
      )
      // Text fade in
      .fromTo(text,
        { opacity: 0 },
        { opacity: 1, duration: 0.3 },
        0.1
      )
      // Hold (doing nothing for 0.7s)
      .to(bubble, { duration: 0.7 }, 0.6)
      // Bounce out
      .to(bubble, {
        opacity: 0,
        y: -40,
        scale: 0.7,
        duration: 0.4,
        ease: "power2.in"
      }, 1.3);
  };

  const initAvatarBubble = () => {
    const avatarStack = document.querySelector('.hero__avatar-stack');
    const bubble = document.querySelector('.avatar-bubble');

    if (!avatarStack || !bubble) return;

    gsap.set(bubble, { opacity: 0 });

    if (!isTouch) {
      avatarStack.addEventListener('mouseenter', showAvatarBubble);
      avatarStack.addEventListener('click', showAvatarBubble);
    }
  };

  initAvatarBubble();

  document.querySelectorAll('a[target="_blank"]').forEach((link) => {
    link.addEventListener("click", () => {
      void playSfx('./assets/audio/click-003.mp3');
    });
  });
});
