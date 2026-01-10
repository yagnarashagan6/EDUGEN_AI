import React, { useState, useEffect, useRef, useMemo } from "react";
import { subscribeToSettings, fetchSettings } from "../supabase";
import "../styles/Youtube.css";

// --- CHANNEL CARD COMPONENT ---
const ChannelCard = ({ channel, isSelected, onSelect }) => (
  <div 
    className={`yt-channel-card ${isSelected ? 'selected' : ''}`}
    onClick={() => onSelect(channel.id)}
  >
    <div className="yt-channel-card-icon">
      <i className="fab fa-youtube"></i>
    </div>
    <div className="yt-channel-card-info">
      <h4 className="yt-channel-card-name">{channel.name}</h4>
      <span className="yt-channel-card-category">{channel.category}</span>
    </div>
    <div className="yt-channel-card-check">
      {isSelected && <i className="fas fa-check-circle"></i>}
    </div>
  </div>
);

// --- INLINE VIDEO PLAYER COMPONENT ---
const InlineVideoPlayer = ({
  videoId,
  onClose,
}) => {
  if (!videoId) return null;

  return (
    <div className="yt-inline-player">
      {/* Video */}
      <div className="yt-inline-video-wrapper">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      </div>

      {/* Close button below video */}
      <div className="yt-inline-close-container">
        <button onClick={onClose} className="yt-inline-close-btn">
          <i className="fas fa-times"></i> Close Video
        </button>
      </div>
    </div>
  );
};

const VideoCard = ({ video, onPlay, onAddFavorite, isFavorite }) => (
  <div className="yt-video-card">
    <div className="yt-card-thumbnail" onClick={() => onPlay(video.id)}>
      <img src={video.thumbnail} alt={video.title} loading="lazy" />
      <div className="yt-card-play-overlay">
        <div className="yt-card-play-icon">
          <i className="fas fa-play"></i>
        </div>
      </div>
      <span className="yt-card-duration">{video.duration}</span>
    </div>
    <div className="yt-card-info">
      <h3 className="yt-card-title" title={video.title}>
        {video.title}
      </h3>
      <p className="yt-card-channel">
        <i className="fas fa-user-circle"></i>
        {video.channel}
      </p>
      <div className="yt-card-actions">
        <button
          onClick={() => onAddFavorite(video)}
          className={`yt-card-fav-btn ${isFavorite ? "is-favorite" : ""}`}
          disabled={isFavorite}
          title={isFavorite ? "Already in favorites" : "Add to favorites"}
        >
          <i className={`fas ${isFavorite ? "fa-check" : "fa-heart"}`}></i>
          <span>{isFavorite ? "Saved" : "Save"}</span>
        </button>
      </div>
    </div>
  </div>
);

// --- MAIN YOUTUBE COMPONENT ---

export default function EduTube() {
  // State management
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("ta");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedChannelIds, setSelectedChannelIds] = useState([]);
  const [channels, setChannels] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [error, setError] = useState("");
  const [playingVideoId, setPlayingVideoId] = useState(null);
  const [importantVideos, setImportantVideos] = useState([]);

  // LocalStorage backed state
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("yt-favorites");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("yt-history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Refs and UI state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const [activeView, setActiveView] = useState("search"); // 'search', 'favorites', or 'important'

  const API_KEY = process.env.REACT_APP_YT_API_KEY;

  // --- DATA FETCHING & SIDE EFFECTS ---

  useEffect(() => {
    localStorage.setItem("yt-history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("yt-favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    // Function to apply settings data
    const applySettings = (data) => {
      console.log("YouTube settings loaded:", data);
      if (data) {
        setLanguage(data.defaultLanguage || "ta");
        setSelectedCategory(data.defaultCategory || "all");
        setSelectedChannelIds(data.defaultChannelIds || []);
        setChannels(data.channels || []);
        setImportantVideos(data.importantVideos || []);
        console.log("Channels set:", data.channels);
        console.log("Important videos set:", data.importantVideos);
      }
      setSettingsLoaded(true);
    };

    // Subscribe to real-time updates
    const unsubscribe = subscribeToSettings("youtube", applySettings);

    // Also fetch directly as a backup
    fetchSettings("youtube").then((data) => {
      if (data && !settingsLoaded) {
        applySettings(data);
      }
    }).catch(err => {
      console.error("Error fetching YouTube settings:", err);
      setSettingsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  // --- API & UTILITY FUNCTIONS ---

  const parseDuration = (iso) => {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "0:00";
    const [, h, m, s] = match.map((val) => parseInt(val) || 0);
    const totalSeconds = h * 3600 + m * 60 + s;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const fetchVideos = async () => {
    if (!topic.trim()) {
      setError("Please enter a search topic.");
      return;
    }

    let channelsToSearch = [];
    if (selectedChannelIds.length > 0) {
      channelsToSearch = channels.filter((c) =>
        selectedChannelIds.includes(c.id)
      );
    } else if (selectedCategory !== "all") {
      channelsToSearch = channels.filter(
        (c) => c.category === selectedCategory
      );
    } else {
      channelsToSearch = channels;
    }

    if (channelsToSearch.length === 0) {
      setError(
        "No channels selected for this category. Please check settings."
      );
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const searchPromises = channelsToSearch.map((channel) => {
        const params = new URLSearchParams({
          key: API_KEY,
          q: topic,
          part: "snippet",
          type: "video",
          maxResults: 10,
          relevanceLanguage: language,
          order: "relevance",
          channelId: channel.id,
          videoEmbeddable: "true",
          safeSearch: "strict",
        });
        return fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
      });

      const responses = await Promise.all(searchPromises);
      const jsonData = await Promise.all(responses.map((res) => res.json()));

      const videoIds = jsonData
        .flatMap((data) => data.items?.map((item) => item.id.videoId) || [])
        .filter(Boolean);

      if (videoIds.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      const uniqueVideoIds = [...new Set(videoIds)];
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${API_KEY}&id=${uniqueVideoIds.join(
        ","
      )}&part=contentDetails,snippet,statistics`;
      const detailsRes = await fetch(detailsUrl);
      const detailsData = await detailsRes.json();

      const formattedResults = detailsData.items
        .map((item) => ({
          id: item.id,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnail:
            item.snippet.thumbnails.high?.url ||
            item.snippet.thumbnails.default?.url,
          duration: parseDuration(item.contentDetails.duration),
          url: `https://www.youtube.com/watch?v=${item.id}`,
        }))
        .sort((a, b) => a.title.localeCompare(b.title)); // Sort alphabetically

      setResults(formattedResults);
    } catch (err) {
      console.error("YouTube search error:", err);
      setError("Failed to fetch videos. The API quota might be exceeded.");
    } finally {
      setLoading(false);
    }
  };

  // --- EVENT HANDLERS ---

  const handleSearch = (e) => {
    e.preventDefault();
    if (topic.trim() && !history.includes(topic.trim())) {
      setHistory((prev) => [topic.trim(), ...prev].slice(0, 10));
    }
    setShowSuggestions(false);
    fetchVideos();
  };

  const addFavorite = (video) => {
    const category =
      channels.find((c) => c.name === video.channel)?.category ||
      "Uncategorized";
    setFavorites((prev) => {
      const categoryFavorites = prev[category] || [];
      if (categoryFavorites.some((fav) => fav.id === video.id)) {
        return prev; // Already exists
      }
      return { ...prev, [category]: [...categoryFavorites, video] };
    });
  };

  const removeFavorite = (video) => {
    setFavorites((prev) => {
      const updatedFavorites = { ...prev };
      for (const category in updatedFavorites) {
        updatedFavorites[category] = updatedFavorites[category].filter(
          (fav) => fav.id !== video.id
        );
        if (updatedFavorites[category].length === 0) {
          delete updatedFavorites[category];
        }
      }
      return updatedFavorites;
    });
  };

  // --- MEMOIZED VALUES ---
  const LANGUAGES = useMemo(
    () => [
      { code: "ta", name: "Tamil" },
      { code: "en", name: "English" },
      { code: "hi", name: "Hindi" },
      { code: "te", name: "Telugu" },
      { code: "ml", name: "Malayalam" },
    ],
    []
  );

  const categoryList = useMemo(
    () => ["all", ...new Set(channels.map((c) => c.category))],
    [channels]
  );

  const filteredChannels = useMemo(
    () =>
      selectedCategory === "all"
        ? channels
        : channels.filter((c) => c.category === selectedCategory),
    [channels, selectedCategory]
  );

  const allFavorites = useMemo(
    () => Object.values(favorites).flat(),
    [favorites]
  );

  const favoriteCategories = useMemo(() => Object.keys(favorites), [favorites]);

  // --- RENDER ---

  if (!settingsLoaded) {
    return (
      <div className="yt-search-container">
        <div className="yt-loader">
          <i className="fas fa-spinner fa-spin"></i>
          <span>Loading EduTube...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="yt-search-container">
      {/* Header with Logo and Navigation */}
      <header className="yt-header">
        <div className="yt-logo">
          <i className="fab fa-youtube"></i>
          <h1>EduTube</h1>
        </div>
        <nav className="yt-nav-toggle">
          <button
            className={activeView === "search" ? "active" : ""}
            onClick={() => setActiveView("search")}
          >
            <i className="fas fa-compass"></i>
            <span>Explore</span>
          </button>
          <button
            className={activeView === "important" ? "active" : ""}
            onClick={() => setActiveView("important")}
          >
            <i className="fas fa-star"></i>
            <span>Important{importantVideos.length > 0 ? ` (${importantVideos.length})` : ''}</span>
          </button>
          <button
            className={activeView === "favorites" ? "active" : ""}
            onClick={() => setActiveView("favorites")}
          >
            <i className="fas fa-heart"></i>
            <span>Saved ({allFavorites.length})</span>
          </button>
        </nav>
      </header>

      {/* Scrollable Content Wrapper */}
      <div className="yt-content-wrapper">
        {/* Search Box - Always visible at top */}
        <div className="yt-search-wrapper">
        <form className="yt-search-form" onSubmit={handleSearch}>
          <div className="yt-search-input-group">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search educational videos..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              ref={inputRef}
            />
            {showSuggestions && history.length > 0 && (
              <div className="yt-suggestions">
                {history
                  .filter((h) => h.toLowerCase().includes(topic.toLowerCase()))
                  .map((item) => (
                    <div
                      key={item}
                      className="yt-suggestion-item"
                      onClick={() => setTopic(item)}
                    >
                      <i className="fas fa-history"></i>
                      <span>{item}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
          <button type="submit" className="yt-search-btn" disabled={loading}>
            {loading ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <>
                <i className="fas fa-search"></i>
                <span>Search</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Inline Video Player */}
      {playingVideoId && (
        <InlineVideoPlayer
          videoId={playingVideoId}
          onClose={() => setPlayingVideoId(null)}
        />
      )}

      {activeView === "search" && (
        <div className="yt-search-view">
          {/* Channel & Category Selection - Dropdown Style */}
          {!playingVideoId && channels.length > 0 && (
            <div className="yt-channel-selection-bar">
              <div className="yt-selection-header">
                <i className="fas fa-tv"></i>
                <span>Select Channels to Search</span>
                <span className="yt-channel-count">({channels.length} channels available)</span>
              </div>
              
              <div className="yt-selection-controls">
                {/* Category Dropdown */}
                <div className="yt-filter-group">
                  <label>
                    <i className="fas fa-folder"></i>
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedChannelIds([]);
                    }}
                    className="yt-category-select"
                  >
                    <option value="all">All Categories ({channels.length})</option>
                    {categoryList.filter(c => c !== 'all').map((category) => (
                      <option key={category} value={category}>
                        {category} ({channels.filter(c => c.category === category).length})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Channel Multi-Select Dropdown */}
                <div className="yt-filter-group yt-channel-select-group">
                  <label>
                    <i className="fab fa-youtube"></i>
                    Channels
                  </label>
                  <div className="yt-channel-dropdown">
                    <select
                      value=""
                      onChange={(e) => {
                        const channelId = e.target.value;
                        if (channelId && !selectedChannelIds.includes(channelId)) {
                          setSelectedChannelIds(prev => [...prev, channelId]);
                        }
                      }}
                      className="yt-channel-select"
                    >
                      <option value="">
                        {selectedChannelIds.length > 0 
                          ? `${selectedChannelIds.length} channel(s) selected` 
                          : 'Select channels...'}
                      </option>
                      {filteredChannels
                        .filter(c => !selectedChannelIds.includes(c.id))
                        .map((channel) => (
                          <option key={channel.id} value={channel.id}>
                            {channel.name} ({channel.category})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Language Dropdown */}
                <div className="yt-filter-group">
                  <label>
                    <i className="fas fa-globe"></i>
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Actions */}
                <div className="yt-quick-actions">
                  <button 
                    type="button"
                    className="yt-quick-action-btn"
                    onClick={() => setSelectedChannelIds(filteredChannels.map(c => c.id))}
                    title="Select all channels"
                  >
                    <i className="fas fa-check-double"></i>
                    All
                  </button>
                  <button 
                    type="button"
                    className="yt-quick-action-btn"
                    onClick={() => setSelectedChannelIds([])}
                    title="Clear selection"
                    disabled={selectedChannelIds.length === 0}
                  >
                    <i className="fas fa-times"></i>
                    Clear
                  </button>
                </div>
              </div>

              {/* Selected Channels Tags */}
              {selectedChannelIds.length > 0 && (
                <div className="yt-selected-channels-tags">
                  <span className="yt-tags-label">Searching in:</span>
                  {selectedChannelIds.map(id => {
                    const channel = channels.find(c => c.id === id);
                    return channel ? (
                      <span key={id} className="yt-channel-tag">
                        <i className="fab fa-youtube"></i>
                        {channel.name}
                        <button 
                          type="button"
                          onClick={() => setSelectedChannelIds(prev => prev.filter(cid => cid !== id))}
                          className="yt-tag-remove"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}

          {/* No Channels Message */}
          {!playingVideoId && channels.length === 0 && (
            <div className="yt-no-channels-message">
              <div className="yt-no-channels-icon">
                <i className="fas fa-tv"></i>
              </div>
              <h3>No Channels Available</h3>
              <p>Your staff hasn't added any YouTube channels yet.</p>
              <p className="yt-no-channels-hint">
                <i className="fas fa-info-circle"></i>
                Please contact your staff to add educational channels.
              </p>
            </div>
          )}

          {/* Results */}
          <div className="yt-results-area">
            {loading && (
              <div className="yt-loader">
                <div className="yt-loader-spinner"></div>
                <span>Searching educational videos...</span>
              </div>
            )}
            {error && (
              <div className="yt-error-message">
                <i className="fas fa-exclamation-triangle"></i>
                <span>{error}</span>
              </div>
            )}
            {!loading && results.length > 0 && (
              <>
                <div className="yt-results-header">
                  <h3>
                    <i className="fas fa-video"></i>
                    Found {results.length} videos for "{topic}"
                  </h3>
                </div>
                <div className="yt-results-grid">
                  {results.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      onPlay={setPlayingVideoId}
                      onAddFavorite={addFavorite}
                      isFavorite={allFavorites.some((fav) => fav.id === video.id)}
                    />
                  ))}
                </div>
              </>
            )}
            {!loading && results.length === 0 && topic && !error && (
              <div className="yt-no-results">
                <div className="yt-no-results-icon">
                  <i className="fas fa-search"></i>
                </div>
                <h3>No videos found</h3>
                <p>Try a different search term or select different channels</p>
              </div>
            )}
            {!loading && results.length === 0 && !topic && !error && (
              <div className="yt-welcome-state">
                <div className="yt-welcome-icon">
                  <i className="fas fa-play-circle"></i>
                </div>
                <h3>Ready to Learn?</h3>
                <p>Search for educational content from curated channels above</p>
                <div className="yt-welcome-tips">
                  <div className="yt-tip">
                    <i className="fas fa-lightbulb"></i>
                    <span>Select channels to narrow your search</span>
                  </div>
                  <div className="yt-tip">
                    <i className="fas fa-heart"></i>
                    <span>Save videos for later viewing</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === "favorites" && (
        <div className="yt-favorites-view">
          {allFavorites.length === 0 ? (
            <div className="yt-no-results">
              <div className="yt-no-results-icon">
                <i className="fas fa-heart"></i>
              </div>
              <h3>No saved videos yet</h3>
              <p>Start exploring and save your favorite videos!</p>
            </div>
          ) : (
            favoriteCategories.map((category) => (
              <div key={category} className="yt-favorite-section">
                <h2 className="yt-section-title">
                  <i className="fas fa-folder-open"></i> {category}
                  <span className="yt-section-count">{favorites[category].length} videos</span>
                </h2>
                <div className="yt-results-grid">
                  {favorites[category].map((video) => (
                    <div className="yt-video-card" key={video.id}>
                      <div
                        className="yt-card-thumbnail"
                        onClick={() => setPlayingVideoId(video.id)}
                      >
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          loading="lazy"
                        />
                        <div className="yt-card-play-overlay">
                          <div className="yt-card-play-icon">
                            <i className="fas fa-play"></i>
                          </div>
                        </div>
                        <span className="yt-card-duration">
                          {video.duration}
                        </span>
                      </div>
                      <div className="yt-card-info">
                        <h3 className="yt-card-title" title={video.title}>
                          {video.title}
                        </h3>
                        <p className="yt-card-channel">
                          <i className="fas fa-user-circle"></i>
                          {video.channel}
                        </p>
                        <div className="yt-card-actions">
                          <button
                            onClick={() => removeFavorite(video)}
                            className="yt-card-fav-btn remove-fav"
                          >
                            <i className="fas fa-trash-alt"></i>
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeView === "important" && (
        <div className="yt-important-view">
          {importantVideos.length === 0 ? (
            <div className="yt-no-results">
              <div className="yt-no-results-icon">
                <i className="fas fa-star"></i>
              </div>
              <h3>No important videos yet</h3>
              <p>Your teacher hasn't added any important videos yet. Check back later!</p>
            </div>
          ) : (
            <div className="yt-important-section">
              <div className="yt-important-header">
                <i className="fas fa-star"></i>
                <h2>Important Videos from Your Teacher</h2>
                <span className="yt-important-count">{importantVideos.length} video{importantVideos.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="yt-important-grid">
                {importantVideos.map((video, index) => (
                  <div className="yt-important-card" key={video.id || index}>
                    <div 
                      className="yt-important-thumbnail"
                      onClick={() => setPlayingVideoId(video.videoId)}
                    >
                      <img
                        src={video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                        alt={video.title}
                        loading="lazy"
                      />
                      <div className="yt-card-play-overlay">
                        <div className="yt-card-play-icon">
                          <i className="fas fa-play"></i>
                        </div>
                      </div>
                      <div className="yt-important-badge">
                        <i className="fas fa-star"></i>
                        Important
                      </div>
                    </div>
                    <div className="yt-important-info">
                      <h3 className="yt-important-title" title={video.title}>
                        {video.title}
                      </h3>
                      {video.description && (
                        <p className="yt-important-description">{video.description}</p>
                      )}
                      <div className="yt-important-meta">
                        {video.subject && (
                          <span className="yt-important-subject">
                            <i className="fas fa-book"></i>
                            {video.subject}
                          </span>
                        )}
                        {video.addedAt && (
                          <span className="yt-important-date">
                            <i className="fas fa-clock"></i>
                            Added {new Date(video.addedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <a 
                        href={`https://www.youtube.com/watch?v=${video.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="yt-important-external-link"
                      >
                        <i className="fab fa-youtube"></i>
                        Watch on YouTube
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
