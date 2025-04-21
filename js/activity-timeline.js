/**
 * Activity Timeline Module
 * Visualizes a user's GitHub activity over time, showing commit frequency and contribution patterns
 */
const ActivityTimeline = (() => {
  // Private variables
  let username = "";
  let activityData = null;
  let timelineChart = null;
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Initialize the module
  function initialize() {
    // Add event listener to the main container for delegation
    document.getElementById("main").addEventListener("click", function (e) {
      if (
        e.target.id === "view-activity-btn" ||
        e.target.closest("#view-activity-btn")
      ) {
        e.preventDefault();
        showActivityTimeline();
      }
    });

    // Create modal structure for the activity timeline
    createActivityModal();
  }

  // Create the activity timeline modal
  function createActivityModal() {
    const modalContainer = document.createElement("div");
    modalContainer.id = "activity-modal";
    modalContainer.className = "activity-modal";
    modalContainer.innerHTML = `
      <div class="activity-content">
        <div class="activity-header">
          <h2><i class="fas fa-chart-line"></i> Activity Timeline</h2>
          <button class="close-activity-modal"><i class="fas fa-times"></i></button>
        </div>
        <div class="activity-body">
          <div id="activity-loader" class="activity-loader">
            <div></div><div></div><div></div>
          </div>
          <div id="activity-error" class="activity-error" style="display: none;"></div>
          <div id="activity-dashboard" class="activity-dashboard" style="display: none;">
            <div class="activity-user-info">
              <img id="activity-user-avatar" class="activity-avatar" src="" alt="User avatar">
              <div class="activity-user-details">
                <h3 id="activity-user-name"></h3>
                <p id="activity-user-login"></p>
              </div>
            </div>
            <div class="activity-sections">
              <div class="activity-section">
                <h3>Contribution Timeline</h3>
                <div class="chart-container">
                  <canvas id="contribution-timeline-chart"></canvas>
                </div>
              </div>
              <div class="activity-section">
                <h3>Activity Breakdown</h3>
                <div id="activity-stats" class="activity-stats"></div>
              </div>
            </div>
            <div class="activity-section">
              <h3>Recent Activity</h3>
              <div id="recent-activity" class="recent-activity-list"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalContainer);

    // Add event listeners
    modalContainer
      .querySelector(".close-activity-modal")
      .addEventListener("click", hideActivityModal);
  }

  // Show the activity timeline modal and load data
  function showActivityTimeline() {
    const userElement = document.querySelector(".user-info h2");
    if (!userElement) return;

    username = userElement.textContent.trim();

    // Show modal
    const modal = document.getElementById("activity-modal");
    modal.classList.add("active");
    document.body.classList.add("modal-open");

    // Show loader and hide other sections
    document.getElementById("activity-loader").style.display = "flex";
    document.getElementById("activity-dashboard").style.display = "none";
    document.getElementById("activity-error").style.display = "none";

    // Load the user's activity data
    loadActivityData();
  }

  // Hide the activity timeline modal
  function hideActivityModal() {
    const modal = document.getElementById("activity-modal");
    modal.classList.remove("active");
    document.body.classList.remove("modal-open");
  }

  // Load the activity data for the current user
  async function loadActivityData() {
    try {
      // First get user info
      const { data: userData } = await axios.get(
        `https://api.github.com/users/${username}`
      );

      // Set user info in the UI
      document.getElementById("activity-user-avatar").src = userData.avatar_url;
      document.getElementById("activity-user-name").textContent =
        userData.name || userData.login;
      document.getElementById(
        "activity-user-login"
      ).textContent = `@${userData.login}`;

      // Get events data (up to 100, which is the max per page)
      const { data: eventsData } = await axios.get(
        `https://api.github.com/users/${username}/events?per_page=100`
      );

      // Get repositories to calculate commit counts
      const { data: reposData } = await axios.get(
        `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`
      );

      // Process the activity data
      processActivityData(userData, eventsData, reposData);

      // Hide loader and show dashboard
      document.getElementById("activity-loader").style.display = "none";
      document.getElementById("activity-dashboard").style.display = "block";
    } catch (error) {
      // Handle errors
      document.getElementById("activity-loader").style.display = "none";
      const errorElement = document.getElementById("activity-error");
      errorElement.style.display = "block";

      if (error.response && error.response.status === 404) {
        errorElement.innerHTML = `
          <i class="fas fa-exclamation-circle"></i>
          <p>Could not load activity data. User not found.</p>
        `;
      } else if (error.response && error.response.status === 403) {
        errorElement.innerHTML = `
          <i class="fas fa-exclamation-circle"></i>
          <p>GitHub API rate limit exceeded. Please try again later.</p>
        `;
      } else {
        errorElement.innerHTML = `
          <i class="fas fa-exclamation-circle"></i>
          <p>Error loading activity data: ${
            error.message || "Unknown error"
          }</p>
        `;
      }
      console.error("Activity timeline error:", error);
    }
  }

  // Process activity data and generate visualizations
  function processActivityData(userData, eventsData, reposData) {
    // Store the processed data
    activityData = {
      user: userData,
      events: eventsData,
      repos: reposData,
      summary: {
        pushEvents: 0,
        pullRequests: 0,
        issues: 0,
        comments: 0,
        createEvents: 0,
        otherEvents: 0,
      },
      timelineData: {},
    };

    // Count event types
    eventsData.forEach((event) => {
      switch (event.type) {
        case "PushEvent":
          activityData.summary.pushEvents++;
          break;
        case "PullRequestEvent":
          activityData.summary.pullRequests++;
          break;
        case "IssuesEvent":
          activityData.summary.issues++;
          break;
        case "IssueCommentEvent":
        case "CommitCommentEvent":
        case "PullRequestReviewCommentEvent":
          activityData.summary.comments++;
          break;
        case "CreateEvent":
          activityData.summary.createEvents++;
          break;
        default:
          activityData.summary.otherEvents++;
      }
    });

    // Process timeline data - group events by date for the last 12 weeks
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84); // 12 weeks * 7 days

    // Create array of dates for the last 12 weeks
    const dates = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const weekDate = new Date(now);
      weekDate.setDate(now.getDate() - i * 7);
      dates.unshift(weekDate); // Add to beginning so dates are in chronological order
    }

    // Initialize counts for each week
    const weeklyCounts = Array(12).fill(0);

    // Count events for each week
    eventsData.forEach((event) => {
      const eventDate = new Date(event.created_at);
      if (eventDate > twelveWeeksAgo) {
        // Find which week this event belongs to
        for (let i = 0; i < dates.length; i++) {
          if (i === 0 && eventDate < dates[0]) {
            weeklyCounts[0]++;
            break;
          } else if (i === dates.length - 1 && eventDate >= dates[i]) {
            weeklyCounts[i]++;
            break;
          } else if (
            i < dates.length - 1 &&
            eventDate >= dates[i] &&
            eventDate < dates[i + 1]
          ) {
            weeklyCounts[i]++;
            break;
          }
        }
      }
    });

    // Generate timeline labels (weeks)
    const timelineLabels = dates.map((date) => {
      return `${monthNames[date.getMonth()]} ${date.getDate()}`;
    });

    // Store the timeline data
    activityData.timelineData = {
      labels: timelineLabels,
      counts: weeklyCounts,
    };

    // Generate visualizations
    generateContributionTimeline();
    generateActivityStats();
    generateRecentActivity();
  }

  // Generate contribution timeline chart
  function generateContributionTimeline() {
    const ctx = document
      .getElementById("contribution-timeline-chart")
      .getContext("2d");

    // Destroy existing chart if it exists
    if (timelineChart) {
      timelineChart.destroy();
    }

    // Get colors based on current theme
    const isDarkTheme =
      document.documentElement.getAttribute("data-theme") !== "light";
    const textColor = isDarkTheme ? "#fff" : "#333";
    const gridColor = isDarkTheme
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.1)";

    // Create gradient for bars
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, "rgba(255, 138, 0, 0.8)");
    gradient.addColorStop(1, "rgba(229, 46, 113, 0.8)");

    // Create the chart
    timelineChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: activityData.timelineData.labels,
        datasets: [
          {
            label: "Activity",
            data: activityData.timelineData.counts,
            backgroundColor: gradient,
            borderColor: "rgba(255, 138, 0, 1)",
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.parsed.y} activities`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
              color: gridColor,
            },
            ticks: {
              color: textColor,
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: gridColor,
            },
            ticks: {
              precision: 0,
              color: textColor,
            },
          },
        },
      },
    });
  }

  // Generate activity stats
  function generateActivityStats() {
    const statsElement = document.getElementById("activity-stats");

    const stats = [
      {
        icon: "fas fa-code-branch",
        label: "Pushes",
        count: activityData.summary.pushEvents,
      },
      {
        icon: "fas fa-code-pull-request",
        label: "Pull Requests",
        count: activityData.summary.pullRequests,
      },
      {
        icon: "fas fa-exclamation-circle",
        label: "Issues",
        count: activityData.summary.issues,
      },
      {
        icon: "fas fa-comment",
        label: "Comments",
        count: activityData.summary.comments,
      },
      {
        icon: "fas fa-plus-circle",
        label: "Created",
        count: activityData.summary.createEvents,
      },
      {
        icon: "fas fa-chart-pie",
        label: "Other",
        count: activityData.summary.otherEvents,
      },
    ];

    // Calculate total for percentages
    const total = stats.reduce((sum, stat) => sum + stat.count, 0);

    const statsHTML = stats
      .map((stat) => {
        const percentage =
          total > 0 ? Math.round((stat.count / total) * 100) : 0;
        return `
        <div class="activity-stat">
          <div class="stat-icon">
            <i class="${stat.icon}"></i>
          </div>
          <div class="stat-details">
            <span class="stat-label">${stat.label}</span>
            <div class="stat-bar-container">
              <div class="stat-bar" style="width: ${percentage}%"></div>
            </div>
            <span class="stat-count">${stat.count} (${percentage}%)</span>
          </div>
        </div>
      `;
      })
      .join("");

    statsElement.innerHTML = statsHTML;
  }

  // Generate recent activity list
  function generateRecentActivity() {
    const recentActivityElement = document.getElementById("recent-activity");

    if (activityData.events.length === 0) {
      recentActivityElement.innerHTML = `<p class="no-activity">No recent activity found</p>`;
      return;
    }

    // Format and display the 10 most recent events
    const recentEvents = activityData.events.slice(0, 10);

    const eventHTML = recentEvents
      .map((event) => {
        const eventDate = new Date(event.created_at);
        const formattedDate = `${eventDate.toLocaleDateString()} ${eventDate.toLocaleTimeString()}`;

        let eventIcon = "fas fa-code";
        let eventLabel = "Activity";
        let eventDetails = "";

        // Format event details based on type
        switch (event.type) {
          case "PushEvent":
            eventIcon = "fas fa-code-branch";
            eventLabel = "Push Event";
            const commits = event.payload.commits
              ? event.payload.commits.length
              : 0;
            eventDetails = `Pushed ${commits} commit${
              commits !== 1 ? "s" : ""
            } to ${event.repo.name}`;
            break;
          case "PullRequestEvent":
            eventIcon = "fas fa-code-pull-request";
            eventLabel = "Pull Request";
            eventDetails = `${event.payload.action} a pull request in ${event.repo.name}`;
            break;
          case "IssuesEvent":
            eventIcon = "fas fa-exclamation-circle";
            eventLabel = "Issue";
            eventDetails = `${event.payload.action} an issue in ${event.repo.name}`;
            break;
          case "IssueCommentEvent":
            eventIcon = "fas fa-comment";
            eventLabel = "Issue Comment";
            eventDetails = `Commented on an issue in ${event.repo.name}`;
            break;
          case "CreateEvent":
            eventIcon = "fas fa-plus-circle";
            eventLabel = "Created";
            eventDetails = `Created a ${event.payload.ref_type} in ${event.repo.name}`;
            break;
          case "DeleteEvent":
            eventIcon = "fas fa-minus-circle";
            eventLabel = "Deleted";
            eventDetails = `Deleted a ${event.payload.ref_type} in ${event.repo.name}`;
            break;
          case "WatchEvent":
            eventIcon = "fas fa-star";
            eventLabel = "Starred";
            eventDetails = `Starred ${event.repo.name}`;
            break;
          case "ForkEvent":
            eventIcon = "fas fa-code-branch";
            eventLabel = "Forked";
            eventDetails = `Forked ${event.repo.name}`;
            break;
          default:
            eventDetails = `Activity in ${event.repo.name}`;
        }

        return `
        <div class="activity-item">
          <div class="activity-icon">
            <i class="${eventIcon}"></i>
          </div>
          <div class="activity-details">
            <div class="activity-type">${eventLabel}</div>
            <div class="activity-description">${eventDetails}</div>
            <div class="activity-time">${formattedDate}</div>
          </div>
        </div>
      `;
      })
      .join("");

    recentActivityElement.innerHTML = eventHTML;
  }

  // Public API
  return {
    initialize,
  };
})();

// Initialize the module when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", ActivityTimeline.initialize);
