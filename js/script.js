const APIURL = "https://api.github.com/users/";

const main = document.getElementById("main");
const form = document.getElementById("form");
const search = document.getElementById("search");

// Function to get user data from GitHub API
async function getUser(username) {
  try {
    const { data } = await axios.get(APIURL + username);
    createUserCard(data);
    getRepos(username);
  } catch (err) {
    if (err.response && err.response.status === 404) {
      createErrorCard("No profile with this username");
    } else {
      createErrorCard("Problem fetching data");
    }
  }
}

// Function to get repositories for a user
async function getRepos(username) {
  try {
    const { data } = await axios.get(
      APIURL + username + "/repos?sort=created&per_page=10"
    );
    addReposToCard(data);
  } catch (err) {
    createErrorCard("Problem fetching repositories");
  }
}

// Function to create user card with profile data
function createUserCard(user) {
  const cardHTML = `
    <div class="card">
        <div>
            <img src="${user.avatar_url}" alt="${user.name}" class="avatar">
        </div>
        <div class="user-info">
            <h2>${user.name || user.login}</h2>
            <p>${user.bio || "No bio available"}</p>

            <ul>
                <li>${user.followers} <strong>Followers</strong></li>
                <li>${user.following} <strong>Following</strong></li>
                <li>${user.public_repos} <strong>Repos</strong></li>
            </ul>

            <div class="user-details">
                ${
                  user.location
                    ? `<span class="detail"><i class="fas fa-map-marker-alt"></i> ${user.location}</span>`
                    : ""
                }
                ${
                  user.blog
                    ? `<span class="detail"><i class="fas fa-link"></i> <a href="${user.blog}" target="_blank">${user.blog}</a></span>`
                    : ""
                }
                ${
                  user.twitter_username
                    ? `<span class="detail"><i class="fab fa-twitter"></i> <a href="https://twitter.com/${user.twitter_username}" target="_blank">@${user.twitter_username}</a></span>`
                    : ""
                }
                ${
                  user.company
                    ? `<span class="detail"><i class="fas fa-building"></i> ${user.company}</span>`
                    : ""
                }
            </div>

            <div class="user-actions">
                <button id="view-activity-btn" class="action-btn">
                    <i class="fas fa-chart-line"></i> Activity Timeline
                </button>
            </div>

            <div id="repos"></div>
        </div>
    </div>
    `;
  main.innerHTML = cardHTML;
}

// Function to show error message
function createErrorCard(msg) {
  const cardHTML = `
        <div class="card error">
            <h2>${msg}</h2>
        </div>
    `;
  main.innerHTML = cardHTML;
}

// Function to add repositories to the user card
function addReposToCard(repos) {
  const reposEl = document.getElementById("repos");

  if (repos.length === 0) {
    reposEl.innerHTML = "<p>No repositories found</p>";
    return;
  }

  repos.slice(0, 10).forEach((repo) => {
    const repoEl = document.createElement("a");
    repoEl.classList.add("repo");
    repoEl.href = repo.html_url;
    repoEl.target = "_blank";
    repoEl.innerText = repo.name;

    // Add stars count
    if (repo.stargazers_count > 0) {
      const starsEl = document.createElement("span");
      starsEl.classList.add("stars");
      starsEl.innerHTML = `<i class="fas fa-star"></i> ${repo.stargazers_count}`;
      repoEl.appendChild(starsEl);
    }

    // Add language indicator if available
    if (repo.language) {
      const langEl = document.createElement("span");
      langEl.classList.add("language");
      langEl.innerText = repo.language;
      repoEl.appendChild(langEl);
    }

    reposEl.appendChild(repoEl);
  });
}

// Event listener for form submission
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const user = search.value.trim();

  if (user) {
    getUser(user);
    search.value = "";
    search.blur();
  }
});

// // Initial state - show GitHub's octocat profile
// window.addEventListener("load", () => {
//   getUser("octocat");
// });
