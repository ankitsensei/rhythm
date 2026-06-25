import { useState, useRef, useEffect } from "react";
import YouTube from "react-youtube";
import demoThumbnail from "./assets/rhythm-thumbnail.png";
import { IoSearch } from "react-icons/io5";
import { FaPause } from "react-icons/fa6";
import { FaPlay } from "react-icons/fa6";
import { FaVolumeHigh } from "react-icons/fa6";
import { FaVolumeLow } from "react-icons/fa6";
import { FaVolumeOff } from "react-icons/fa6";
import { TbRepeatOff } from "react-icons/tb";
import { TbRepeatOnce } from "react-icons/tb";
import { TbRepeat } from "react-icons/tb";

interface VideoItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    thumbnails: {
      high: {
        url: string;
      };
    };
  };
}

interface YouTubeResponse {
  items: VideoItem[];
}

type RepeatMode = "off" | "one" | "all";

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

export default function App() {
  const [query, setQuery] = useState("");
  const [ytData, setYtData] = useState<YouTubeResponse | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(100);
  const [previousVolume, setPreviousVolume] = useState(100);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const playerRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchVideos = async (searchTerm = query) => {
    if (!searchTerm.trim()) return;

    try {
      setLoading(true);

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
          searchTerm,
        )}&maxResults=10&key=${API_KEY}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch videos");
      }

      const data: YouTubeResponse = await response.json();

      setYtData(data);
      setSuggestions([]);

      if (data.items.length > 0) {
        setSelectedVideo(data.items[0]);
      }

      inputRef.current?.blur();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerReady = (event: any) => {
    playerRef.current = event.target;

    setTimeout(() => {
      setDuration(playerRef.current.getDuration());

      playerRef.current.setVolume(100);
      setVolume(100);

      playerRef.current.playVideo();
      setIsPlaying(true);
    }, 500);
  };

  const handleVolumeChange = (value: number) => {
    if (!playerRef.current) return;

    playerRef.current.setVolume(value);
    setVolume(value);
  };

  // Handle Volume Mute
  const handleVolMute = () => {
    if (!playerRef.current) return;

    if (volume > 0) {
      setPreviousVolume(volume);
      playerRef.current.setVolume(0);
      setVolume(0);
    } else {
      playerRef.current.setVolume(previousVolume);
      setVolume(previousVolume);
    }
  };

  const togglePlayPause = () => {
    if (!playerRef.current) return;

    const state = playerRef.current.getPlayerState();

    if (state === 1) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const seekVideo = (value: number) => {
    if (!playerRef.current) return;

    playerRef.current.seekTo(value, true);
    setCurrentTime(value);
  };

  const toggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === "off") return "one";
      if (prev === "one") return "all";
      return "off";
    });
  };

  const handleVideoEnd = () => {
    if (!playerRef.current) return;

    // Repeat current song
    if (repeatMode === "one") {
      playerRef.current.seekTo(0);
      playerRef.current.playVideo();
      return;
    }

    // Repeat playlist
    if (repeatMode === "all" && ytData) {
      const currentIndex = ytData.items.findIndex(
        (video) => video.id.videoId === selectedVideo?.id.videoId,
      );

      const nextIndex =
        currentIndex === ytData.items.length - 1 ? 0 : currentIndex + 1;

      setSelectedVideo(ytData.items[nextIndex]);
      return;
    }

    // repeatMode === "off"
    setIsPlaying(false);
  };

  const fetchSuggestions = async (searchQuery: string) => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
          searchQuery,
        )}&maxResults=5&key=${API_KEY}`,
      );

      const data: YouTubeResponse = await response.json();

      const titles = [...new Set(data.items.map((item) => item.snippet.title))];

      setSuggestions(titles);
    } catch (error) {
      console.error(error);
      setSuggestions([]);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current) {
        setCurrentTime(playerRef.current.getCurrentTime());
        setDuration(playerRef.current.getDuration());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const selectSuggestion = (suggestion: string) => {
    setShowSuggestions(false);
    setQuery(suggestion);
    setSuggestions([]);
    searchVideos(suggestion);
  };

  useEffect(() => {
    if (!showSuggestions) return;

    const timer = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, showSuggestions]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center gap-6 px-6 py-20">
      <h1 className="text-3xl font-bold">Rhythm 🎵</h1>

      {!selectedVideo ? (
        <div className="flex flex-col items-start">
          <img
            src={demoThumbnail}
            alt="Rhythm"
            className="h-80 rounded-2xl object-cover"
          />

          <p className="mt-4">Search for a song to start listening.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 w-full max-w-xl">
          <img
            src={selectedVideo.snippet.thumbnails.high.url}
            alt={selectedVideo.snippet.title}
            className="w-full h-80 object-cover rounded-2xl border border-zinc-700"
          />

          <h2 className="text-center">{selectedVideo.snippet.title}</h2>

          <YouTube
            videoId={selectedVideo.id.videoId}
            onReady={handlePlayerReady}
            onEnd={handleVideoEnd}
            opts={{
              width: "0",
              height: "0",
              playerVars: {
                autoplay: 1,
              },
            }}
          />

          <div className="w-full flex gap-2 items-center">
            <p>{formatTime(currentTime)}</p>
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              onChange={(e) => seekVideo(Number(e.target.value))}
              className="w-full"
            />
            <p>{formatTime(duration)}</p>
          </div>

          <div className="flex gap-4 text-sm w-full justify-between">
            <button
              onClick={togglePlayPause}
              className="px-4 py-2 rounded-lg border"
            >
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            <button
              onClick={toggleRepeat}
              className="px-2 py text-2xl rounded-lg border"
            >
              {repeatMode === "off" && <TbRepeatOff />}
              {repeatMode === "one" && <TbRepeatOnce />}
              {repeatMode === "all" && <TbRepeat />}
            </button>
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center gap-2">
                <span onClick={handleVolMute}
                  className="cursor-pointer">
                <span>
                  {volume === 0 && <FaVolumeOff />}
                  {volume > 0 && volume <= 60 && <FaVolumeLow />}
                  {volume > 60 && <FaVolumeHigh />}
                </span>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-40"
                />
                <span className="w-8">{volume}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          searchVideos();
        }}
        className="border border-zinc-600 px-3 py-2 rounded-lg flex items-center gap-2"
      >
        <div className="relative">
          <input
            type="text"
            ref={inputRef}
            placeholder="Press / to focus"
            value={query}
            onChange={(e) => {
              setShowSuggestions(true);
              setQuery(e.target.value);
            }}
            className="outline-none w-72"
          />

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-full rounded-lg border border-zinc-600 bg-white dark:bg-zinc-900 shadow-lg z-50">
              {suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => selectSuggestion(item)}
                  className="block w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="submit">
          <IoSearch />
        </button>
      </form>

      {loading && <p>Loading...</p>}

      {ytData && ytData.items.length > 0 && (
        <div className="w-full max-w-xl flex flex-col gap-2">
          <h3 className="font-semibold">Search Results</h3>

          {ytData.items.map((video) => (
            <button
              key={video.id.videoId}
              onClick={() => setSelectedVideo(video)}
              className="flex items-center gap-3 p-2 rounded-lg border border-zinc-700 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <img
                src={video.snippet.thumbnails.high.url}
                alt={video.snippet.title}
                className="w-20 rounded-lg"
              />

              <span className="text-zinc-400 hover:text-zinc-200">
                {video.snippet.title}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
