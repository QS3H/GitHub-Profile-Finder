// Repository Analytics Module
const RepoAnalytics = (() => {
  // Private variables
  let allRepos = [];
  let username = "";
  let chartInstances = {};

  // Initialize analytics
  function initialize() {
    // Listen for the main script events
    document.addEventListener("DOMContentLoaded", () => {
      // Add analytics button to the header
      addAnalyticsButton();

      // Create analytics modal
      createAnalyticsModal();
    });
  }

  // Add analytics button to the header
  function addAnalyticsButton() {
    const header = document.querySelector("header");
    if (!header) return;

    const analyticsBtn = document.createElement("button");
    analyticsBtn.id = "analytics-btn";
    analyticsBtn.className = "analytics-btn";
    analyticsBtn.innerHTML =
      '<i class="fas fa-chart-bar"></i> Repository Analytics';
    analyticsBtn.addEventListener("click", showAnalyticsModal);

    header.appendChild(analyticsBtn);
  }

  // Create analytics modal
  function createAnalyticsModal() {
    const modalContainer = document.createElement("div");
    modalContainer.id = "analytics-modal";
    modalContainer.className = "analytics-modal";
    modalContainer.innerHTML = `
      <div class="analytics-content">
        <div class="analytics-header">
          <h2><i class="fas fa-chart-bar"></i> Repository Analytics</h2>
          <button class="close-modal"><i class="fas fa-times"></i></button>
        </div>
        <div class="analytics-body">
          <div class="analytics-search">
            <input type="text" id="analytics-search" placeholder="Enter GitHub username...">
            <button id="analyze-btn">Analyze</button>
          </div>
          <div id="analytics-loader" class="analytics-loader" style="display: none;">
            <div></div><div></div><div></div>
          </div>
          <div id="analytics-error" class="analytics-error" style="display: none;"></div>
          <div id="analytics-dashboard" class="analytics-dashboard" style="display: none;">
            <div class="analytics-user-header">
              <img id="analytics-user-avatar" src="" alt="User avatar" class="analytics-avatar">
              <div class="analytics-user-info">
                <h3 id="analytics-user-name"></h3>
                <p id="analytics-user-login"></p>
                <p id="analytics-repo-count"></p>
              </div>
            </div>
            <div class="analytics-sections">
              <div class="analytics-section">
                <h3>Languages Distribution</h3>
                <div class="chart-container">
                  <canvas id="languages-chart"></canvas>
                </div>
              </div>
              <div class="analytics-section">
                <h3>Stars by Repository</h3>
                <div class="chart-container">
                  <canvas id="stars-chart"></canvas>
                </div>
              </div>
              <div class="analytics-section">
                <h3>Repository Size Distribution</h3>
                <div class="chart-container">
                  <canvas id="size-chart"></canvas>
                </div>
              </div>
              <div class="analytics-section">
                <h3>Most Active Repositories</h3>
                <div id="active-repos" class="active-repos-list"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalContainer);

    // Add event listeners
    modalContainer
      .querySelector(".close-modal")
      .addEventListener("click", hideAnalyticsModal);
    document
      .getElementById("analyze-btn")
      .addEventListener("click", analyzeUser);
    document
      .getElementById("analytics-search")
      .addEventListener("keyup", (e) => {
        if (e.key === "Enter") analyzeUser();
      });
  }

  // Show analytics modal
  function showAnalyticsModal() {
    const modal = document.getElementById("analytics-modal");
    modal.classList.add("active");
    document.body.classList.add("modal-open");

    // If current user is open in the main view, pre-fill the search
    const userElement = document.querySelector(".user-info h2");
    if (userElement) {
      const currentUser = userElement.textContent;
      document.getElementById("analytics-search").value = currentUser;
    }
  }

  // Hide analytics modal
  function hideAnalyticsModal() {
    const modal = document.getElementById("analytics-modal");
    modal.classList.remove("active");
    document.body.classList.remove("modal-open");
  }

  // Analyze user repositories
  async function analyzeUser() {
    const searchInput = document.getElementById("analytics-search");
    username = searchInput.value.trim();

    if (!username) return;

    // Show loader and hide other sections
    document.getElementById("analytics-loader").style.display = "flex";
    document.getElementById("analytics-dashboard").style.display = "none";
    document.getElementById("analytics-error").style.display = "none";

    try {
      // First get user info
      const { data: userData } = await axios.get(
        `https://api.github.com/users/${username}`
      );

      // Then get all repositories (up to 100)
      const { data: reposData } = await axios.get(
        `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`
      );

      // Store repositories
      allRepos = reposData;

      // Update user info in the UI
      document.getElementById("analytics-user-avatar").src =
        userData.avatar_url;
      document.getElementById("analytics-user-name").textContent =
        userData.name || userData.login;
      document.getElementById(
        "analytics-user-login"
      ).textContent = `@${userData.login}`;
      document.getElementById(
        "analytics-repo-count"
      ).textContent = `${userData.public_repos} public repositories`;

      // Generate analytics
      generateAnalytics(userData, allRepos);

      // Hide loader and show dashboard
      document.getElementById("analytics-loader").style.display = "none";
      document.getElementById("analytics-dashboard").style.display = "block";
    } catch (error) {
      // Handle errors
      document.getElementById("analytics-loader").style.display = "none";
      const errorElement = document.getElementById("analytics-error");
      errorElement.style.display = "block";

      if (error.response && error.response.status === 404) {
        errorElement.innerHTML = `
          <i class="fas fa-exclamation-circle"></i>
          <p>User not found. Please check the username and try again.</p>
        `;
      } else {
        errorElement.innerHTML = `
          <i class="fas fa-exclamation-circle"></i>
          <p>Error fetching data: ${error.message || "Unknown error"}</p>
        `;
      }
      console.error("Analytics error:", error);
    }
  }

  // Generate analytics visualizations
  function generateAnalytics(userData, repos) {
    // Clear previous chart instances
    Object.values(chartInstances).forEach((chart) => chart.destroy());
    chartInstances = {};

    // Generate language distribution chart
    generateLanguageChart(repos);

    // Generate stars chart
    generateStarsChart(repos);

    // Generate size distribution chart
    generateSizeChart(repos);

    // Generate most active repositories list
    generateActiveRepos(repos);
  }

  // Generate language distribution chart
  function generateLanguageChart(repos) {
    const languageData = {};

    // Count languages
    repos.forEach((repo) => {
      if (repo.language) {
        languageData[repo.language] = (languageData[repo.language] || 0) + 1;
      }
    });

    // Sort languages by count
    const sortedLanguages = Object.entries(languageData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // Take top 8 languages

    // Prepare chart data
    const labels = sortedLanguages.map((item) => item[0]);
    const counts = sortedLanguages.map((item) => item[1]);

    // Generate colors based on languages
    const colors = generateLanguageColors(labels);

    // Create chart
    const ctx = document.getElementById("languages-chart").getContext("2d");

    chartInstances.languages = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: counts,
            backgroundColor: colors,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: "#fff",
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.raw || 0;
                const total = context.chart.data.datasets[0].data.reduce(
                  (a, b) => a + b,
                  0
                );
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} repos (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  // Generate stars chart for top repositories
  function generateStarsChart(repos) {
    // Sort repositories by stars
    const sortedRepos = [...repos]
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 10); // Top 10 by stars

    // Prepare chart data
    const labels = sortedRepos.map((repo) => repo.name);
    const starCounts = sortedRepos.map((repo) => repo.stargazers_count);

    // Create chart
    const ctx = document.getElementById("stars-chart").getContext("2d");

    chartInstances.stars = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Stars",
            data: starCounts,
            backgroundColor: "rgba(255, 215, 0, 0.7)",
            borderColor: "rgba(255, 215, 0, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#fff",
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
          },
          y: {
            ticks: {
              color: "#fff",
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
          },
        },
      },
    });
  }

  // Generate repository size distribution chart
  function generateSizeChart(repos) {
    // Group repositories by size range
    const sizeRanges = {
      "Tiny (<10KB)": 0,
      "Small (10KB-100KB)": 0,
      "Medium (100KB-1MB)": 0,
      "Large (1MB-10MB)": 0,
      "Huge (>10MB)": 0,
    };

    repos.forEach((repo) => {
      const sizeKB = repo.size;
      if (sizeKB < 10) {
        sizeRanges["Tiny (<10KB)"]++;
      } else if (sizeKB < 100) {
        sizeRanges["Small (10KB-100KB)"]++;
      } else if (sizeKB < 1000) {
        sizeRanges["Medium (100KB-1MB)"]++;
      } else if (sizeKB < 10000) {
        sizeRanges["Large (1MB-10MB)"]++;
      } else {
        sizeRanges["Huge (>10MB)"]++;
      }
    });

    // Prepare chart data
    const labels = Object.keys(sizeRanges);
    const counts = Object.values(sizeRanges);

    // Create chart
    const ctx = document.getElementById("size-chart").getContext("2d");

    chartInstances.size = new Chart(ctx, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [
          {
            data: counts,
            backgroundColor: [
              "rgba(54, 162, 235, 0.7)",
              "rgba(75, 192, 192, 0.7)",
              "rgba(255, 206, 86, 0.7)",
              "rgba(255, 159, 64, 0.7)",
              "rgba(255, 99, 132, 0.7)",
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: "#fff",
            },
          },
        },
      },
    });
  }

  // Generate list of most active repositories
  function generateActiveRepos(repos) {
    // Sort by last push date (most recent first)
    const activeRepos = [...repos]
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 5); // Top 5 most recently active

    const activeReposElement = document.getElementById("active-repos");

    if (activeRepos.length === 0) {
      activeReposElement.innerHTML =
        '<p class="no-repos">No active repositories found</p>';
      return;
    }

    // Generate HTML for each repository
    const reposHTML = activeRepos
      .map((repo) => {
        const lastPush = new Date(repo.pushed_at);
        const timeAgo = getTimeAgo(lastPush);

        return `
        <div class="active-repo">
          <div class="repo-info">
            <a href="${repo.html_url}" target="_blank" class="repo-name">
              ${repo.name}
            </a>
            <p class="repo-description">${
              repo.description || "No description available"
            }</p>
            <div class="repo-meta">
              ${
                repo.language
                  ? `<span class="repo-language">${repo.language}</span>`
                  : ""
              }
              <span class="repo-stars">
                <i class="fas fa-star"></i> ${repo.stargazers_count}
              </span>
              <span class="repo-forks">
                <i class="fas fa-code-branch"></i> ${repo.forks_count}
              </span>
            </div>
          </div>
          <div class="repo-activity">
            <span class="last-push">
              <i class="fas fa-clock"></i> ${timeAgo}
            </span>
          </div>
        </div>
      `;
      })
      .join("");

    activeReposElement.innerHTML = reposHTML;
  }

  // Generate colors for language chart based on common language colors
  function generateLanguageColors(languages) {
    const languageColorMap = {
      JavaScript: "rgba(241, 224, 90, 0.8)",
      TypeScript: "rgba(49, 120, 198, 0.8)",
      HTML: "rgba(227, 76, 38, 0.8)",
      CSS: "rgba(86, 61, 124, 0.8)",
      Python: "rgba(53, 114, 165, 0.8)",
      Java: "rgba(176, 114, 25, 0.8)",
      PHP: "rgba(79, 93, 149, 0.8)",
      Ruby: "rgba(193, 37, 41, 0.8)",
      "C#": "rgba(23, 134, 0, 0.8)",
      "C++": "rgba(243, 75, 125, 0.8)",
      Go: "rgba(0, 173, 216, 0.8)",
      Swift: "rgba(255, 172, 69, 0.8)",
      Rust: "rgba(222, 165, 132, 0.8)",
    };

    // Default colors for unknown languages
    const defaultColors = [
      "rgba(255, 99, 132, 0.8)",
      "rgba(54, 162, 235, 0.8)",
      "rgba(255, 206, 86, 0.8)",
      "rgba(75, 192, 192, 0.8)",
      "rgba(153, 102, 255, 0.8)",
      "rgba(255, 159, 64, 0.8)",
      "rgba(199, 199, 199, 0.8)",
      "rgba(83, 102, 255, 0.8)",
    ];

    return languages.map(
      (lang, index) =>
        languageColorMap[lang] || defaultColors[index % defaultColors.length]
    );
  }

  // Format time ago
  function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return "just now";
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`;
    } else if (diffDay < 30) {
      return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }

  // Public API
  return {
    initialize,
  };
})();

// Initialize the module
RepoAnalytics.initialize();
