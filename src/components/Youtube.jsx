import React, { useState, useEffect, useRef } from "react";
import "../styles/Youtube.css";

const LANGUAGES = [
  { code: "ta", name: "Tamil" },
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "te", name: "Telugu" },
  { code: "ml", name: "Malayalam" },
];

const CHANNELS = [
  {
    id: "UCrx-FlNM6BWOJvu3re6HH7w",
    name: "4G Silver Academy தமிழ்",
    category: "Engineering",
    language: "ta",
  },
  {
    id: "UCwr-evhuzGZgDFrq_1pLt_A",
    name: "Error Makes Clever",
    category: "Coding",
    language: "ta",
  },
  {
    id: "UC4SVo0Ue36XCfOyb5Lh1viQ",
    name: "Bro Code",
    category: "Coding",
    language: "en",
  },
  {
    id: "UC8GD4akofUsOzgNpaiAisdQ",
    name: "Mathematics kala",
    category: "Maths",
    language: "ta",
  },
];

const CATEGORY_LIST = Array.from(new Set(CHANNELS.map((c) => c.category)));

const API_KEY = process.env.REACT_APP_YT_API_KEY;

function parseDuration(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h, m, s] = match.map(Number);

  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
}

async function youtubeSearch(query, langCode, channelId) {
  const allowedChannel = CHANNELS.find(
    (c) =>
      c.id === channelId || c.name.toLowerCase() === query.trim().toLowerCase()
  );
  if (!allowedChannel) {
    return [];
  }

  const languageName = LANGUAGES.find((l) => l.code === langCode)?.name;
  let finalQuery = query;

  if (langCode !== "all" && languageName) {
    finalQuery = `${query} ${languageName}`;
  }

  const params = new URLSearchParams({
    key: API_KEY,
    q: finalQuery,
    part: "snippet",
    type: "video",
    maxResults: 10,
    relevanceLanguage: langCode !== "all" ? langCode : undefined,
    order: "relevance",
    channelId: allowedChannel.id,
    videoEmbeddable: "true",
    safeSearch: "strict",
  });

  const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.items || data.items.length === 0) return [];

  const validVideoItems = data.items.filter((item) => item.id.videoId);
  if (validVideoItems.length === 0) return [];

  const videoIds = validVideoItems.map((item) => item.id.videoId).join(",");
  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${API_KEY}&id=${videoIds}&part=contentDetails,snippet,statistics`;
  const detailsRes = await fetch(detailsUrl);
  const detailsData = await detailsRes.json();

  return detailsData.items
    .map((item) => {
      const durationSec = parseDuration(item.contentDetails.duration);
      return {
        id: item.id,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        language: langCode,
        thumbnail: item.snippet.thumbnails.high.url,
        duration: item.contentDetails.duration.replace("PT", "").toLowerCase(),
        durationSec,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        viewCount: item.statistics
          ? parseInt(item.statistics.viewCount, 10)
          : 0,
      };
    })
    .filter((item) => item.durationSec >= 60);
}

export default function Youtube({ containerBodyRef }) {
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("ta");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedChannelIds, setSelectedChannelIds] = useState([]);
  const [results, setResults] = useState([]);
  const [resultsPage, setResultsPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("favoriteVideos");
    return saved ? JSON.parse(saved) : {};
  });
  const [preview, setPreview] = useState(null);
  const [playingVideoId, setPlayingVideoId] = useState(null);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("searchHistory");
    return saved ? JSON.parse(saved) : [];
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [error, setError] = useState("");
  const [resultsPageTokens, setResultsPageTokens] = useState({ 1: undefined });
  const [allResults, setAllResults] = useState([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [filterChannelId, setFilterChannelId] = useState(""); // For filtering search results
  const [favCategoryFilter, setFavCategoryFilter] = useState(""); // For toggling favorite categories

  // Dropdown open/close state for custom channel dropdown
  const [channelDropdownOpen, setChannelDropdownOpen] = useState(false);
  const channelDropdownRef = useRef(null);
  const videoPlayerRef = useRef(null); // Add this line

  useEffect(() => {
    localStorage.setItem("searchHistory", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("favoriteVideos", JSON.stringify(favorites));
  }, [favorites]);

  const filteredSuggestions = topic
    ? history.filter(
        (item) =>
          item.toLowerCase().includes(topic.toLowerCase()) && item !== topic
      )
    : history;

  // Filter channels based on selected category
  const filteredChannels =
    selectedCategory === "all"
      ? CHANNELS
      : CHANNELS.filter((c) => c.category === selectedCategory);

  // Group filtered channels for dropdown
  const groupedChannels = filteredChannels.reduce((acc, channel) => {
    if (!acc[channel.category]) acc[channel.category] = [];
    acc[channel.category].push(channel);
    return acc;
  }, {});

  const fetchVideos = async (page = 1, append = false) => {
    let allowedChannels = [];
    if (selectedChannelIds.length > 0 && selectedChannelIds[0] !== "all") {
      allowedChannels = CHANNELS.filter((c) =>
        selectedChannelIds.includes(c.id)
      );
    } else if (selectedCategory !== "all") {
      allowedChannels = CHANNELS.filter((c) => c.category === selectedCategory);
    } else {
      allowedChannels = CHANNELS;
    }

    if (allowedChannels.length === 0) {
      setResults([]);
      setError("Please select a valid channel or category.");
      setHasMoreResults(false);
      return;
    }

    setLoading(true);
    setPlayingVideoId(null);

    const maxResults = 10;
    let pageToken = undefined;
    if (page > 1 && resultsPageTokens[page]) {
      pageToken = resultsPageTokens[page];
    }

    // Fetch videos from all selected channels and merge results
    let allNewVideos = [];
    for (const channel of allowedChannels) {
      const params = new URLSearchParams({
        key: API_KEY,
        q: topic,
        part: "snippet",
        type: "video",
        maxResults: maxResults,
        relevanceLanguage: language !== "all" ? language : undefined,
        order: "relevance",
        channelId: channel.id,
        videoEmbeddable: "true",
        safeSearch: "strict",
        ...(pageToken ? { pageToken } : {}),
      });

      const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();

      setResultsPageTokens((prev) => ({
        ...prev,
        [page + 1]: data.nextPageToken,
      }));

      if (!data.items || data.items.length === 0) continue;

      const validVideoItems = data.items.filter((item) => item.id.videoId);
      if (validVideoItems.length === 0) continue;

      const videoIds = validVideoItems.map((item) => item.id.videoId).join(",");
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${API_KEY}&id=${videoIds}&part=contentDetails,snippet,statistics`;
      const detailsRes = await fetch(detailsUrl);
      const detailsData = await detailsRes.json();

      let newVideos = detailsData.items
        .map((item) => {
          const durationSec = parseDuration(item.contentDetails.duration);
          return {
            id: item.id,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            language: language,
            thumbnail: item.snippet.thumbnails.high.url,
            duration: item.contentDetails.duration
              .replace("PT", "")
              .toLowerCase(),
            durationSec,
            url: `https://www.youtube.com/watch?v=${item.id}`,
          };
        })
        .filter((item) => item.durationSec >= 60);

      allNewVideos = [...allNewVideos, ...newVideos];
    }

    // Sort and deduplicate by video id
    const lowerTopic = topic.trim().toLowerCase();
    allNewVideos = allNewVideos
      .filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i)
      .sort((a, b) => {
        const aInTitle = a.title.toLowerCase().includes(lowerTopic) ? 1 : 0;
        const bInTitle = b.title.toLowerCase().includes(lowerTopic) ? 1 : 0;
        if (aInTitle !== bInTitle) return bInTitle - aInTitle;
        return 0;
      });

    setHasMoreResults(
      allNewVideos.length >= maxResults * allowedChannels.length
    );

    if (append) {
      setResults((prev) => [...prev, ...allNewVideos]);
      setAllResults((prev) => [...prev, ...allNewVideos]);
    } else {
      setResults(allNewVideos);
      setAllResults(allNewVideos);
    }
    setLoading(false);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");
    setResultsPage(1);
    setResultsPageTokens({ 1: undefined });
    await fetchVideos(1, false);

    setHistory((prev) => {
      const exists = prev.find(
        (item) => item.toLowerCase() === topic.toLowerCase()
      );
      if (exists) {
        return [topic, ...prev.filter((item) => item !== exists)];
      }
      return [topic, ...prev].slice(0, 10);
    });
    setShowSuggestions(false);
  };

  // Show only the first visibleCount videos
  const visibleResults = allResults.slice(0, visibleCount);

  // Load more handler
  const handleLoadMore = async () => {
    // If we have more in allResults, just increase visibleCount
    if (visibleCount + 5 <= allResults.length) {
      setVisibleCount((prev) => prev + 5);
    } else if (hasMoreResults && !loading) {
      // If we need more from API, fetch next page
      const nextPage = resultsPage + 1;
      setResultsPage(nextPage);
      await fetchVideos(nextPage, true);
      setVisibleCount((prev) => prev + 5);
    }
  };

  const handleInputChange = (e) => {
    setTopic(e.target.value);
    setShowSuggestions(true);
    setActiveSuggestion(-1);
    setError("");
  };

  const handleSuggestionClick = (suggestion) => {
    setTopic(suggestion);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
    setError("");
  };

  const handleInputKeyDown = (e) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      setActiveSuggestion((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      setActiveSuggestion((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === "Enter" && activeSuggestion >= 0) {
      e.preventDefault();
      handleSuggestionClick(filteredSuggestions[activeSuggestion]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    function handleClick(e) {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLanguageChange = (e) => setLanguage(e.target.value);
  const handleCategoryChange = (e) => {
    const value = e.target.value;
    setSelectedCategory(value);
    setSelectedChannelIds([]); // Reset channel selection on category change
  };

  function addFavorite(video) {
    setFavorites((prevFavorites) => {
      const channel =
        CHANNELS.find((c) => c.id === video.channelId) ||
        CHANNELS.find(
          (c) =>
            c.name.trim().toLowerCase() === video.channel.trim().toLowerCase()
        );
      const category = channel ? channel.category : "Uncategorized";
      const categoryVideos = Array.isArray(prevFavorites[category])
        ? prevFavorites[category]
        : [];
      const exists = categoryVideos.some((v) => v.id === video.id);

      if (exists) {
        return prevFavorites;
      }

      return {
        ...prevFavorites,
        [category]: [...categoryVideos, video],
      };
    });
  }

  // Scroll to top of the container when playing a video
  const handlePlayVideo = (videoId) => {
    setPlayingVideoId(videoId);
    setShowSuggestions(false);
    setTimeout(() => {
      if (videoPlayerRef.current) {
        videoPlayerRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } else if (containerBodyRef.current) {
        containerBodyRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.OneSignal) {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(function (OneSignal) {
          OneSignal.Notifications.showNotification("Hey there! 👋", {
            body: "Check out the latest videos or your favorites!",
            icon: "/favicon.ico",
            url: window.location.href,
          });
        });
      }
    }, 5 * 60 * 1000);

    return () => clearTimeout(timer);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        channelDropdownRef.current &&
        !channelDropdownRef.current.contains(event.target)
      ) {
        setChannelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle checkbox change for channels
  const handleChannelCheckboxChange = (e) => {
    const value = e.target.value;
    setSelectedChannelIds((prev) =>
      e.target.checked ? [...prev, value] : prev.filter((id) => id !== value)
    );
  };

  // Update language automatically based on selected channels
  useEffect(() => {
    if (selectedChannelIds.length === 1) {
      const channel = CHANNELS.find((c) => c.id === selectedChannelIds[0]);
      if (channel && language !== channel.language) {
        setLanguage(channel.language);
      }
    } else if (selectedChannelIds.length > 1) {
      const langs = selectedChannelIds
        .map((id) => CHANNELS.find((c) => c.id === id)?.language)
        .filter(Boolean);
      const uniqueLangs = Array.from(new Set(langs));
      if (uniqueLangs.length === 1 && language !== uniqueLangs[0]) {
        setLanguage(uniqueLangs[0]);
      }
    }
  }, [selectedChannelIds, language]);

  // Get unique channels from current search results for filter dropdown
  const uniqueResultChannels = Array.from(
    new Set(results.map((v) => v.channel))
  ).map((channelName) => {
    const channelObj = CHANNELS.find((c) => c.name === channelName);
    return channelObj
      ? { id: channelObj.id, name: channelObj.name }
      : { id: channelName, name: channelName };
  });

  // Filtered visible results by channel filter
  const filteredVisibleResults =
    filterChannelId && filterChannelId !== "all"
      ? visibleResults.filter(
          (video) =>
            CHANNELS.find((c) => c.id === filterChannelId)?.name ===
            video.channel
        )
      : visibleResults;

  // Get all favorite categories with videos
  const favCategories = Object.keys(favorites).filter(
    (cat) => Array.isArray(favorites[cat]) && favorites[cat].length > 0
  );

  return (
    <>
      <form className="search-form" onSubmit={handleSearch} autoComplete="off">
        <div className="search-input-group">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type or select a channel name (e.g., 4G Silver Academy)"
            value={topic}
            onChange={handleInputChange}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleInputKeyDown}
            required
            autoComplete="off"
            className="search-input"
          />
          <button type="submit" disabled={loading} className="search-btn">
            {loading ? "Searching..." : "Search"}
          </button>
          {showSuggestions && filteredSuggestions.length > 0 && (
            <ul className="search-suggestions">
              {filteredSuggestions.map((suggestion, idx) => (
                <li
                  key={idx}
                  className={
                    "search-suggestion-item" +
                    (activeSuggestion === idx ? " active" : "")
                  }
                  onMouseDown={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="search-options-group">
          <button
            type="button"
            className={`fav-toggle-btn${showFavorites ? " active" : ""}`}
            onClick={() => setShowFavorites((prev) => !prev)}
            title="Show Favorites"
          >
            ★
          </button>
          <select value={language} onChange={handleLanguageChange}>
            <option value="all">Any Language</option>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
          {/* New Category Dropdown */}
          <select value={selectedCategory} onChange={handleCategoryChange}>
            <option value="all">All Categories</option>
            {CATEGORY_LIST.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {/* Custom Channel Dropdown with Checkbox Multi-select */}
          <div ref={channelDropdownRef} className="youtube-channel-dropdown">
            <div
              className="youtube-channel-dropdown-toggle"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setChannelDropdownOpen((open) => !open)}
              tabIndex={0}
            >
              <span>
                {selectedChannelIds.length === 0
                  ? "Select Channel(s)"
                  : filteredChannels
                      .filter((c) => selectedChannelIds.includes(c.id))
                      .map((c) => c.name)
                      .join(", ")}
              </span>
              <span style={{ marginLeft: 8, fontSize: "1.2em" }}>▼</span>
            </div>
            {channelDropdownOpen && (
              <div
                className="youtube-channel-dropdown-list"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {Object.entries(groupedChannels).map(([category, channels]) => (
                  <div key={category}>
                    <div className="youtube-channel-dropdown-category">
                      {category}
                    </div>
                    {channels.map((channel) => (
                      <label key={channel.id}>
                        <input
                          type="checkbox"
                          value={channel.id}
                          checked={selectedChannelIds.includes(channel.id)}
                          onChange={handleChannelCheckboxChange}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {channel.name}
                      </label>
                    ))}
                  </div>
                ))}
                {filteredChannels.length === 0 && (
                  <div style={{ padding: "8px 16px", color: "#888" }}>
                    No channels available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </form>

      {/* --- Channel Filter Dropdown after Search --- */}
      {!showFavorites && results.length > 0 && (
        <div
          style={{
            margin: "10px 0 20px 0",
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <label htmlFor="channel-filter" style={{ fontWeight: 500 }}>
            Filter by Channel:
          </label>
          <select
            id="channel-filter"
            value={filterChannelId}
            onChange={(e) => setFilterChannelId(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          >
            <option value="">All Channels</option>
            {uniqueResultChannels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="educational-error shake error-message">{error}</div>
      )}

      {playingVideoId && (
        <>
          <div className="video-player" ref={videoPlayerRef}>
            <iframe
              width="560"
              height="315"
              src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
          <button
            className="close-player-button"
            onClick={() => setPlayingVideoId(null)}
          >
            Close Video
          </button>
        </>
      )}

      {/* --- Favorite Category Toggle Buttons --- */}
      {showFavorites && favCategories.length > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            {favCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`fav-toggle-btn${
                  favCategoryFilter === cat ? " active" : ""
                }`}
                style={{
                  background: favCategoryFilter === cat ? "#1a73e8" : "#e0e0e0",
                  color: favCategoryFilter === cat ? "#fff" : "#333",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 18px",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontSize: "1em",
                }}
                onClick={() =>
                  setFavCategoryFilter((prev) => (prev === cat ? "" : cat))
                }
              >
                {cat}
              </button>
            ))}
          </div>
          <h2
            className="favorite-videos-title"
            style={{ display: "flex", justifyContent: "center" }}
          >
            Favorite Videos
          </h2>
          <div className="results">
            {Object.entries(favorites)
              .filter(
                ([category, videos]) =>
                  Array.isArray(videos) &&
                  videos.length > 0 &&
                  (!favCategoryFilter || favCategoryFilter === category)
              )
              .flatMap(([category, videos]) =>
                videos.map((video) => (
                  <div
                    className="video-card"
                    key={video.id}
                    onMouseEnter={() => setPreview(video.id)}
                    onMouseLeave={() => setPreview(null)}
                  >
                    <div
                      className="video-thumbnail-wrapper video-thumbnail-pointer"
                      onClick={() => handlePlayVideo(video.id)}
                    >
                      <img src={video.thumbnail} alt={video.title} />
                    </div>
                    <div className="video-info">
                      <h3>{video.title}</h3>
                      <p>
                        <b>Channel:</b> {video.channel}
                        <br />
                        <b>Language:</b>{" "}
                        {LANGUAGES.find((l) => l.code === video.language)
                          ?.name || video.language}{" "}
                        | <b>Duration:</b> {video.duration}
                      </p>
                      <button
                        className="delete-fav-btn align-right"
                        onClick={() => {
                          setFavorites((prev) => {
                            const updated = { ...prev };
                            updated[category] = updated[category].filter(
                              (v) => v.id !== video.id
                            );
                            if (updated[category].length === 0)
                              delete updated[category];
                            return updated;
                          });
                        }}
                      >
                        ❌ Remove Favorite
                      </button>
                    </div>
                  </div>
                ))
              )}
            {Object.entries(favorites).filter(
              ([_, videos]) => Array.isArray(videos) && videos.length > 0
            ).length %
              2 !==
              0 && <div className="invisible-placeholder"></div>}
          </div>
        </div>
      )}

      {/* --- Search Results --- */}
      {!showFavorites && (
        <h2 id="r" className="results-title" style={{ textAlign: "center" }}>
          Results
        </h2>
      )}
      {!showFavorites && results.length > 0 && (
        <div className="results">
          {filteredVisibleResults.map((video) => {
            // Check if this video is already in favorites
            const isFav = Object.values(favorites).some(
              (videos) =>
                Array.isArray(videos) && videos.some((v) => v.id === video.id)
            );
            return (
              <div
                className="video-card"
                key={video.id}
                onMouseEnter={() => setPreview(video.id)}
                onMouseLeave={() => setPreview(null)}
              >
                <div
                  className="video-thumbnail-wrapper video-thumbnail-pointer"
                  onClick={() => handlePlayVideo(video.id)}
                >
                  <img src={video.thumbnail} alt={video.title} />
                </div>
                <div className="video-info">
                  <h3>{video.title}</h3>
                  <p>
                    <b>Channel:</b> {video.channel}
                    <br />
                    <b>Language:</b>{" "}
                    {LANGUAGES.find((l) => l.code === video.language)?.name ||
                      video.language}{" "}
                    | <b>Duration:</b> {video.duration}
                  </p>
                  <button
                    onClick={() => addFavorite(video)}
                    className={isFav ? "fav-added" : ""}
                    disabled={isFav}
                  >
                    {isFav ? "★ Added" : "Add Favorite"}
                  </button>
                </div>
              </div>
            );
          })}
          {(visibleCount < allResults.length || hasMoreResults) && (
            <div className="load-more-container">
              <button
                className="load-more-btn"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
