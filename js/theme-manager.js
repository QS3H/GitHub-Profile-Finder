/**
 * Theme Manager Module
 * Handles theme switching between light and dark modes
 */
const ThemeManager = (() => {
  // Private variables
  const STORAGE_KEY = "github-finder-theme";
  let currentTheme = localStorage.getItem(STORAGE_KEY) || "dark"; // Default is dark theme

  // Initialize theme manager
  function initialize() {
    // Apply saved theme on page load
    applyTheme(currentTheme);

    // Add theme toggle button to header
    createThemeToggle();

    // Listen for system theme changes
    listenForSystemThemeChanges();
  }

  // Create and add theme toggle button
  function createThemeToggle() {
    const header = document.querySelector("header");
    if (!header) return;

    const themeToggle = document.createElement("button");
    themeToggle.className = "theme-toggle";
    themeToggle.setAttribute("aria-label", "Toggle theme");
    themeToggle.setAttribute(
      "title",
      `Switch to ${currentTheme === "dark" ? "light" : "dark"} mode`
    );
    themeToggle.innerHTML = `<i class="fas ${
      currentTheme === "dark" ? "fa-sun" : "fa-moon"
    }"></i>`;

    themeToggle.addEventListener("click", toggleTheme);
    header.appendChild(themeToggle);
  }

  // Toggle between light and dark themes
  function toggleTheme() {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(currentTheme);
    saveThemePreference();

    // Update button icon and title
    const themeToggle = document.querySelector(".theme-toggle");
    if (themeToggle) {
      themeToggle.innerHTML = `<i class="fas ${
        currentTheme === "dark" ? "fa-sun" : "fa-moon"
      }"></i>`;
      themeToggle.setAttribute(
        "title",
        `Switch to ${currentTheme === "dark" ? "light" : "dark"} mode`
      );
    }
  }

  // Apply the selected theme to the document
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    currentTheme = theme;

    // Update Chart.js themes if charts exist
    updateChartThemes();
  }

  // Update Chart.js themes if any charts are present
  function updateChartThemes() {
    // Check if Chart is available and if there are any chart instances
    if (typeof Chart !== "undefined" && Chart.instances) {
      const textColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--text-color")
        .trim();

      const gridColor =
        currentTheme === "dark"
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(0, 0, 0, 0.1)";

      // Update each chart instance with new theme colors
      Object.values(Chart.instances).forEach((chart) => {
        // Update scale colors
        if (chart.config.options.scales) {
          const scales = chart.config.options.scales;

          if (scales.x) {
            scales.x.ticks = { ...scales.x.ticks, color: textColor };
            scales.x.grid = { ...scales.x.grid, color: gridColor };
          }

          if (scales.y) {
            scales.y.ticks = { ...scales.y.ticks, color: textColor };
            scales.y.grid = { ...scales.y.grid, color: gridColor };
          }
        }

        // Update legend colors
        if (
          chart.config.options.plugins &&
          chart.config.options.plugins.legend
        ) {
          chart.config.options.plugins.legend.labels = {
            ...chart.config.options.plugins.legend.labels,
            color: textColor,
          };
        }

        chart.update();
      });
    }
  }

  // Save theme preference to localStorage
  function saveThemePreference() {
    localStorage.setItem(STORAGE_KEY, currentTheme);
  }

  // Listen for system theme preference changes
  function listenForSystemThemeChanges() {
    if (window.matchMedia) {
      const colorSchemeQuery = window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

      // If user hasn't manually set a preference, follow system
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(colorSchemeQuery.matches ? "dark" : "light");
        const themeToggle = document.querySelector(".theme-toggle");
        if (themeToggle) {
          themeToggle.innerHTML = `<i class="fas ${
            currentTheme === "dark" ? "fa-sun" : "fa-moon"
          }"></i>`;
        }
      }

      // Listen for changes
      colorSchemeQuery.addEventListener("change", (e) => {
        if (!localStorage.getItem(STORAGE_KEY)) {
          applyTheme(e.matches ? "dark" : "light");
          const themeToggle = document.querySelector(".theme-toggle");
          if (themeToggle) {
            themeToggle.innerHTML = `<i class="fas ${
              currentTheme === "dark" ? "fa-sun" : "fa-moon"
            }"></i>`;
          }
        }
      });
    }
  }

  // Get current theme
  function getCurrentTheme() {
    return currentTheme;
  }

  // Public API
  return {
    initialize,
    toggleTheme,
    getCurrentTheme,
  };
})();

// Initialize the theme manager when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", ThemeManager.initialize);
