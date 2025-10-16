import React, { useState, useEffect, useRef, useMemo } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase"; // Assuming firebase config is in src/firebase.js

// --- HELPER COMPONENTS ---

const VideoPlayer = ({ videoId, onClose }) => {
  const playerRef = useRef(null);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [videoId]);

  if (!videoId) return null;

  return (
    <div className="yt-video-player-backdrop">
      <div className="yt-video-player-container" ref={playerRef}>
        <div className="yt-video-responsive-embed">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        </div>
        <button
          onClick={onClose}
          className="yt-video-close-btn"
          title="Close player"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
};

const VideoCard = ({ video, onPlay, onAddFavorite, isFavorite }) => (
  <div className="yt-video-card">
    <div className="yt-card-thumbnail" onClick={() => onPlay(video.id)}>
      <img src={video.thumbnail} alt={video.title} loading="lazy" />
      <div className="yt-card-play-icon">
        <i className="fab fa-youtube"></i>
      </div>
      <span className="yt-card-duration">{video.duration}</span>
    </div>
    <div className="yt-card-info">
      <h3 className="yt-card-title">{video.title}</h3>
      <p className="yt-card-channel">{video.channel}</p>
      <div className="yt-card-actions">
        <button
          onClick={() => onAddFavorite(video)}
          className={`yt-card-fav-btn ${isFavorite ? "is-favorite" : ""}`}
          disabled={isFavorite}
          title={isFavorite ? "Already in favorites" : "Add to favorites"}
        >
          <i className={`fas ${isFavorite ? "fa-star" : "fa-star-o"}`}></i>
          <span>{isFavorite ? "Added" : "Favorite"}</span>
        </button>
      </div>
    </div>
  </div>
);

// --- MAIN YOUTUBE COMPONENT ---

export default function Youtube() {
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
  const [activeView, setActiveView] = useState("search"); // 'search' or 'favorites'

  const API_KEY = process.env.REACT_APP_YT_API_KEY;

  // --- DATA FETCHING & SIDE EFFECTS ---

  useEffect(() => {
    localStorage.setItem("yt-history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("yt-favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const settingsRef = doc(db, "settings", "youtube");
    const unsubscribe = onSnapshot(
      settingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLanguage(data.defaultLanguage || "ta");
          setSelectedCategory(data.defaultCategory || "all");
          setSelectedChannelIds(data.defaultChannelIds || []);
          setChannels(data.channels || []);
        }
        setSettingsLoaded(true);
      },
      (err) => {
        console.error("Failed to load YouTube settings:", err);
        setError("Could not load channel settings.");
        setSettingsLoaded(true);
      }
    );

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
      <div className="yt-loader">
        <i className="fas fa-spinner fa-spin"></i>
        <span>Loading Settings...</span>
      </div>
    );
  }

  return (
    <div className="yt-search-container">
      <VideoPlayer
        videoId={playingVideoId}
        onClose={() => setPlayingVideoId(null)}
      />

      <header className="yt-header">
        <div className="yt-logo">
          <i className="fab fa-youtube"></i>
          <h1>EduTube Search</h1>
        </div>
        <div className="yt-view-toggle">
          <button
            className={activeView === "search" ? "active" : ""}
            onClick={() => setActiveView("search")}
          >
            <i className="fas fa-search"></i> Search
          </button>
          <button
            className={activeView === "favorites" ? "active" : ""}
            onClick={() => setActiveView("favorites")}
          >
            <i className="fas fa-star"></i> Favorites ({allFavorites.length})
          </button>
        </div>
      </header>

      {activeView === "search" && (
        <div className="yt-search-view">
          <form className="yt-search-form" onSubmit={handleSearch}>
            <div className="yt-search-bar" ref={inputRef}>
              <i className="fas fa-search yt-search-icon"></i>
              <input
                type="text"
                placeholder="Enter a topic to search..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                required
              />
              {showSuggestions && history.length > 0 && (
                <div className="yt-suggestions">
                  {history
                    .filter((h) =>
                      h.toLowerCase().includes(topic.toLowerCase())
                    )
                    .map((item) => (
                      <div
                        key={item}
                        className="yt-suggestion-item"
                        onClick={() => {
                          setTopic(item);
                        }}
                      >
                        <i className="fas fa-history"></i> {item}
                      </div>
                    ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="yt-search-button"
            >
              {loading ? <i className="fas fa-spinner fa-spin"></i> : "Search"}
            </button>
          </form>

          <div className="yt-filters">
            <div className="yt-filter-group">
              <label>
                <i className="fas fa-language"></i> Language
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
            <div className="yt-filter-group">
              <label>
                <i className="fas fa-list-alt"></i> Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categoryList.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "All Categories" : c}
                  </option>
                ))}
              </select>
            </div>
            <div className="yt-filter-group yt-channel-filter">
              <label>
                <i className="fas fa-tv"></i> Channels
              </label>
              <div className="yt-channel-selector">
                {filteredChannels.length > 0 ? (
                  filteredChannels.map((channel) => (
                    <label key={channel.id} className="yt-channel-tag">
                      <input
                        type="checkbox"
                        value={channel.id}
                        checked={selectedChannelIds.includes(channel.id)}
                        onChange={(e) => {
                          const { value, checked } = e.target;
                          setSelectedChannelIds((prev) =>
                            checked
                              ? [...prev, value]
                              : prev.filter((id) => id !== value)
                          );
                        }}
                      />
                      <span>{channel.name}</span>
                    </label>
                  ))
                ) : (
                  <span className="yt-no-channels">
                    No channels in this category
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="yt-results-area">
            {loading && (
              <div className="yt-loader">
                <i className="fas fa-spinner fa-spin"></i>
                <span>Fetching Videos...</span>
              </div>
            )}
            {error && <div className="yt-error-message">{error}</div>}
            {!loading && results.length > 0 && (
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
            )}
            {!loading && results.length === 0 && topic && (
              <div className="yt-no-results">
                No videos found for "{topic}". Try a different search.
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === "favorites" && (
        <div className="yt-favorites-view">
          {allFavorites.length === 0 ? (
            <div className="yt-no-results">
              You haven't added any favorite videos yet.
            </div>
          ) : (
            favoriteCategories.map((category) => (
              <div key={category} className="yt-favorite-category-section">
                <h2 className="yt-category-title">{category}</h2>
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
                        <div className="yt-card-play-icon">
                          <i className="fab fa-youtube"></i>
                        </div>
                        <span className="yt-card-duration">
                          {video.duration}
                        </span>
                      </div>
                      <div className="yt-card-info">
                        <h3 className="yt-card-title">{video.title}</h3>
                        <p className="yt-card-channel">{video.channel}</p>
                        <div className="yt-card-actions">
                          <button
                            onClick={() => removeFavorite(video)}
                            className="yt-card-fav-btn remove-fav"
                            title="Remove from favorites"
                          >
                            <i className="fas fa-trash"></i>
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
    </div>
  );
}
