import {
  ChevronDown as ChevronDownIcon,
  Maximize2 as Maximize2Icon,
  Menu as MenuIcon,
  Settings as SettingsIcon,
  Star as StarIcon,
  X as XIcon,
  Search as SearchIcon,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import DragonTower from "../../games/dragontower";
import { useGameStore } from "../../games/dragontower/store/useGameStore";
import { MAX_BET } from "../../games/dragontower/constants";
import { usePlayerStore, DEMO_BALANCE } from "../../store/usePlayerStore";
import {
  isFavorite as checkFavorite,
  toggleFavorite,
} from "../../utils/session";

const navigationItems = [
  {
    icon: "🎰",
    label: "Casino",
    hasDropdown: true,
    badge: null,
    children: [
      { icon: "🎲", label: "All Games" },
      { icon: "🃏", label: "Dragon Tower", active: true },
      { icon: "💣", label: "Mines" },
      { icon: "📈", label: "Crash" },
      { icon: "🎡", label: "Wheel" },
    ],
  },
  {
    icon: "⚽",
    label: "Sports",
    hasDropdown: true,
    badge: 4,
    children: [
      { icon: "🏟", label: "Sports Lobby" },
      { icon: "▶", label: "In-Play" },
      { icon: "📅", label: "Upcoming" },
      { icon: "📊", label: "Outrights" },
    ],
  },
  { icon: "🗺", label: "Roadmap", hasDropdown: false },
  { icon: "🎁", label: "Promotions", hasDropdown: false },
  { icon: "🤝", label: "Affiliate", hasDropdown: false },
  { icon: "❓", label: "FAQ", hasDropdown: false },
];

const fmtUsd = (v: number) =>
  "USD " +
  v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const Dragon = (): JSX.Element => {
  const globalBalance = usePlayerStore((s) => s.balance);
  const globalMode = usePlayerStore((s) => s.mode);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Casino"]);
  const isDemo = globalMode === "demo";
  const isPlaying = usePlayerStore((s) => s.playing);
  const canToggleMode = !isPlaying;
  const setIsDemo = (demo: boolean) => {
    if (!canToggleMode) return;
    const ps = usePlayerStore.getState();
    const gs = useGameStore.getState();
    const newMode = demo ? "demo" : "real";
    const newBalance = demo ? DEMO_BALANCE : 0;
    ps.setMode(newMode);
    ps.setBalance(newBalance);
    gs.setMode(newMode);
    gs.setTestMode(demo);
    gs.setBalance(newBalance);
  };
  const [isFav, setIsFav] = useState(() => checkFavorite());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeNav, setActiveNav] = useState("Casino");
  const [showNotif, setShowNotif] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [instantBet, setInstantBet] = useState(false);
  const [showMaxBetConfirm, setShowMaxBetConfirm] = useState(false);
  const volume = useGameStore((s) => s.volume);
  const setVolume = useGameStore((s) => s.setVolume);
  const [animations, setAnimations] = useState(true);
  const maxBet = useGameStore((s) => s.maxBet);
  const setMaxBet = useGameStore((s) => s.setMaxBet);
  const [activeHotkeys, setActiveHotkeys] = useState(false);
  const [notifications] = useState([
    { id: 1, text: "Welcome to Dragon Tower!", time: "Just now" },
    { id: 2, text: "Your balance has been updated", time: "2m ago" },
    { id: 3, text: "New promotion available!", time: "1h ago" },
  ]);

  const handleFavorite = useCallback(() => {
    const next = toggleFavorite();
    setIsFav(next);
  }, []);

  const handleFullscreen = useCallback(() => {
    const el = document.getElementById("dragon-app");
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  return (
    <div className="bg-[#020401] w-full min-h-screen flex flex-col lg:flex-row">
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:sticky top-0 left-0 w-[251px] h-screen bg-[#020401] border-r border-[#1d1d1d] flex flex-col z-50 transition-transform duration-300 lg:z-40`}
      >
        <div className="pt-[75px]">
          <ScrollArea className="h-[calc(100vh-75px)]">
            <nav className="flex flex-col">
              {navigationItems.map((item, index) => {
                const isExpanded = expandedItems.includes(item.label);
                const isActive = activeNav === item.label;
                const toggleExpand = () => {
                  setExpandedItems((prev) =>
                    prev.includes(item.label)
                      ? prev.filter((x) => x !== item.label)
                      : [...prev, item.label],
                  );
                };

                return (
                  <div key={index}>
                    <button
                      className={`flex items-center justify-between w-full px-6 py-3 text-white transition-colors [font-family:'Inter',Helvetica] text-sm ${
                        isActive
                          ? "bg-[#1a191d] border-l-2 border-[#eaff00]"
                          : "hover:bg-[#1a191d]"
                      }`}
                      onClick={() => {
                        setActiveNav(item.label);
                        if (item.hasDropdown) {
                          toggleExpand();
                        } else {
                          setSidebarOpen(false);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                        {item.badge !== null && item.badge !== undefined && (
                          <span className="ml-1 bg-[#eaff00] text-[#020401] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.hasDropdown && (
                        <ChevronDownIcon
                          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                        />
                      )}
                    </button>

                    {item.hasDropdown && isExpanded && item.children && (
                      <div className="bg-[#0a0a0d] border-l border-[#1d1d1d]">
                        {item.children.map((child, childIndex) => (
                          <button
                            key={childIndex}
                            className={`flex items-center gap-3 w-full px-6 py-3 pl-12 transition-colors [font-family:'Inter',Helvetica] text-sm ${
                              (child as any).active
                                ? "text-[#eaff00] bg-[#0d1520]"
                                : "text-white hover:bg-[#1a191d]"
                            }`}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <span>{child.icon}</span>
                            <span>{child.label}</span>
                            {(child as any).active && (
                              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#eaff00]" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </ScrollArea>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col w-full">
        <div className="relative shrink-0">
          <img
            className="absolute top-px right-0 w-[388px] h-[75px] hidden xl:block pointer-events-none"
            alt="Header background"
            src="/dragon-tower/header-background.png"
          />

          <div
            id="head-1"
            className="flex items-center justify-between px-3 sm:px-4 lg:px-[22px] py-0 h-[60px] sm:h-[75px] bg-[#020401] fixed top-0 left-0 right-0 z-30 lg:relative lg:z-auto"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-white hover:bg-[#1a191d]"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <MenuIcon className="w-5 h-5" />
              </Button>

              <Button className="bg-[#eaff00] hover:bg-[#d4e600] text-black [font-family:'Poppins',Helvetica] font-semibold px-3 sm:px-4 lg:px-8 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs lg:text-sm">
                🎰 Casino
              </Button>

              <Button
                variant="ghost"
                className="hidden sm:flex text-white hover:bg-[#1a191d] [font-family:'Poppins',Helvetica] font-semibold px-3 sm:px-4 lg:px-8 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs lg:text-sm"
              >
                ⚽ Sports
              </Button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-[#1a191d] rounded-lg px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2">
                <span className="text-white [font-family:'Poppins',Helvetica] text-[10px] sm:text-xs lg:text-sm">
                  💰 {fmtUsd(globalBalance)}
                </span>
              </div>

              <Button className="bg-[#eaff00] hover:bg-[#d4e600] text-black [font-family:'Poppins',Helvetica] font-semibold px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs lg:text-sm">
                💳 Deposit
              </Button>

              <div className="flex items-center gap-0.5 sm:gap-1 lg:gap-2">
                {/* Search */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:flex text-white hover:bg-[#1a191d] rounded-lg h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9"
                  onClick={() => setShowSearch(!showSearch)}
                >
                  <SearchIcon className="w-4 h-4" />
                </Button>
                {/* User */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-[#1a191d] rounded-lg h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9"
                >
                  👤
                </Button>
                {/* Notifications */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden md:flex text-white hover:bg-[#1a191d] rounded-lg h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9"
                    onClick={() => setShowNotif(!showNotif)}
                  >
                    🔔
                    <span className="absolute top-0 right-0 w-2 h-2 bg-[#eaff00] rounded-full" />
                  </Button>

                  {/* Notification dropdown */}
                  {showNotif && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-[#1a191d] border border-[#333] rounded-xl shadow-2xl z-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#333]">
                        <span className="text-white text-sm font-semibold">
                          Notifications
                        </span>
                        <button
                          onClick={() => setShowNotif(false)}
                          className="text-[#666] hover:text-white"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className="px-4 py-3 border-b border-[#222] hover:bg-[#222] transition-colors cursor-pointer"
                        >
                          <div className="text-white text-xs">{n.text}</div>
                          <div className="text-[#666] text-[10px] mt-1">
                            {n.time}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden lg:flex text-white hover:bg-[#1a191d] rounded-lg h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9"
                >
                  🌐
                </Button>
              </div>
            </div>
          </div>

          {/* Search bar overlay */}
          {showSearch && (
            <div className="fixed top-[60px] sm:top-[75px] left-0 right-0 z-30 bg-[#020401] border-b border-[#333] px-4 py-3 flex items-center gap-3">
              <SearchIcon className="w-4 h-4 text-[#666]" />
              <input
                autoFocus
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white text-sm [font-family:'Poppins',Helvetica] placeholder:text-[#444]"
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                className="text-[#666] hover:text-white"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <header
          id="sub-head-1"
          className="flex items-center justify-between px-3 sm:px-4 lg:px-[26px] py-2 sm:py-4 bg-transparent mt-[60px] sm:mt-[75px] lg:mt-0"
        >
          <h1 className="[font-family:'Inter',Helvetica] font-bold text-white text-sm sm:text-base lg:text-[17px]">
            Dragon Tower
          </h1>

          <div className="flex items-center gap-1 lg:gap-2">
            {/* Favorite */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 ${
                isFav ? "text-[#eaff00]" : "text-white hover:bg-[#1a191d]"
              }`}
              onClick={handleFavorite}
            >
              <StarIcon
                className={`w-4 h-4 lg:w-5 lg:h-5 ${isFav ? "fill-[#eaff00]" : ""}`}
              />
            </Button>
            <span
              className={`hidden sm:inline text-xs lg:text-sm [font-family:'Poppins',Helvetica] cursor-pointer ${
                isFav ? "text-[#eaff00]" : "text-white"
              }`}
              onClick={handleFavorite}
            >
              {isFav ? "Favorited" : "Add Favorite"}
            </span>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              className={`hidden md:flex h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 ${
                isFullscreen
                  ? "text-[#eaff00]"
                  : "text-white hover:bg-[#1a191d]"
              }`}
              onClick={handleFullscreen}
            >
              <Maximize2Icon className="w-4 h-4 lg:w-5 lg:h-5" />
            </Button>

            {/* Demo/Real toggle */}
            <div
              className={`hidden md:flex items-center gap-2 bg-[#1a191d] rounded-full px-2 sm:px-3 lg:px-4 py-1 ml-1 sm:ml-2 transition-opacity ${canToggleMode ? "" : "opacity-50 pointer-events-none"}`}
            >
              <span
                className={`text-[10px] sm:text-xs lg:text-sm [font-family:'Poppins',Helvetica] font-medium cursor-pointer ${isDemo ? "text-white" : "text-[#666]"}`}
                onClick={() => setIsDemo(true)}
              >
                Demo
              </span>
              <button
                onClick={() => setIsDemo(!isDemo)}
                className={`relative inline-flex h-5 sm:h-6 w-9 sm:w-11 items-center rounded-full transition-colors ${
                  isDemo ? "bg-[#eaff00]" : "bg-[#333]"
                }`}
              >
                <span
                  className={`inline-block h-4 sm:h-5 w-4 sm:w-5 transform rounded-full bg-[#020401] transition-transform ${
                    isDemo
                      ? "translate-x-0.5"
                      : "translate-x-4 sm:translate-x-5"
                  }`}
                />
              </button>
              <span
                className={`text-[10px] sm:text-xs lg:text-sm [font-family:'Poppins',Helvetica] font-medium cursor-pointer ${!isDemo ? "text-white" : "text-[#666]"}`}
                onClick={() => setIsDemo(false)}
              >
                Real
              </span>
            </div>

            {/* Settings */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 ${showSettings ? "text-[#eaff00]" : "text-white hover:bg-[#1a191d]"}`}
                onClick={() => setShowSettings(!showSettings)}
              >
                <SettingsIcon className="w-4 h-4 lg:w-5 lg:h-5" />
              </Button>

              {showSettings && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[#1a191d] border border-[#333] rounded-xl shadow-2xl z-50 overflow-hidden">
                  {/* Volume */}
                  <div className="px-4 py-3 border-b border-[#222]">
                    <div className="flex items-center gap-3">
                      <span className="text-white text-sm">🔊</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={volume}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setVolume(v);
                        }}
                        className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #4a9eff ${volume}%, #333 ${volume}%)`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Instant Bet */}
                  <button
                    className={`flex items-center gap-3 w-full px-4 py-3 border-b border-[#222] transition-colors ${instantBet ? "bg-[#252525] text-[#eaff00]" : "text-white hover:bg-[#222]"}`}
                    onClick={() => setInstantBet(!instantBet)}
                  >
                    <span className="text-lg">⚡</span>
                    <span className="[font-family:'Poppins',Helvetica] text-sm font-medium">
                      Instant Bet
                    </span>
                  </button>

                  {/* Animations */}
                  <button
                    className={`flex items-center gap-3 w-full px-4 py-3 border-b border-[#222] transition-colors ${animations ? "bg-[#252525] text-[#eaff00]" : "text-white hover:bg-[#222]"}`}
                    onClick={() => setAnimations(!animations)}
                  >
                    <span className="text-lg">✨</span>
                    <span className="[font-family:'Poppins',Helvetica] text-sm font-medium">
                      Animations
                    </span>
                  </button>

                  {/* Max Bet */}
                  <button
                    className={`flex items-center gap-3 w-full px-4 py-3 border-b border-[#222] transition-colors ${maxBet ? "bg-[#252525] text-[#eaff00]" : "text-white hover:bg-[#222]"}`}
                    onClick={() => {
                      if (!maxBet) {
                        setShowSettings(false);
                        setShowMaxBetConfirm(true);
                      } else {
                        setMaxBet(false);
                      }
                    }}
                  >
                    <span className="text-lg">🔥</span>
                    <span className="[font-family:'Poppins',Helvetica] text-sm font-medium">
                      Max Bet
                    </span>
                    {maxBet && (
                      <span className="ml-auto text-xs font-bold bg-[#eaff00] text-black px-2 py-0.5 rounded">
                        MAX
                      </span>
                    )}
                  </button>

                  {/* Game Info */}
                  <button
                    className="flex items-center gap-3 w-full px-4 py-3 border-b border-[#222] text-white hover:bg-[#222] transition-colors"
                    onClick={() => {
                      // TODO: implement game info
                    }}
                  >
                    <span className="text-lg">📋</span>
                    <span className="[font-family:'Poppins',Helvetica] text-sm font-medium">
                      Game Info
                    </span>
                  </button>

                  {/* Hotkeys */}
                  <button
                    className={`flex items-center gap-3 w-full px-4 py-3 transition-colors ${activeHotkeys ? "bg-[#252525] text-[#eaff00]" : "text-white hover:bg-[#222]"}`}
                    onClick={() => {
                      setActiveHotkeys(!activeHotkeys);
                      // TODO: implement hotkeys toggle
                    }}
                  >
                    <span className="text-lg">⌨️</span>
                    <span className="[font-family:'Poppins',Helvetica] text-sm font-medium">
                      Hotkeys
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 flex justify-center lg:p-[15px]">
          <DragonTower />
        </div>
      </main>

      {/* Close notification on outside click */}
      {showNotif && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotif(false)}
        />
      )}

      {/* Close settings on outside click */}
      {showSettings && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSettings(false)}
        />
      )}

      {/* Max Bet Confirm Overlay */}
      {showMaxBetConfirm &&
        (() => {
          const dragonApp = document.getElementById("dragon-app");
          const rect = dragonApp?.getBoundingClientRect();
          return (
            <div
              style={{
                position: "fixed",
                top: rect?.top ?? 0,
                left: rect?.left ?? 0,
                width: rect?.width ?? "100%",
                height: rect?.height ?? "100%",
                background: "rgba(0,0,0,0.7)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  background: "#0d1520",
                  borderRadius: 16,
                  padding: "28px 32px",
                  width: 420,
                  maxWidth: "90%",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ fontSize: 20 }}>🔥</span>
                    <span
                      style={{
                        color: "#fff",
                        fontFamily: "Poppins, sans-serif",
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      Max Bet
                    </span>
                  </div>
                  <button
                    onClick={() => setShowMaxBetConfirm(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#666",
                      cursor: "pointer",
                      fontSize: 18,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Body */}
                <p
                  style={{
                    color: "#aaa",
                    fontFamily: "Poppins, sans-serif",
                    fontSize: 14,
                    marginBottom: 28,
                    lineHeight: 1.6,
                  }}
                >
                  Are you sure you want to enable the max bet button?
                </p>

                {/* Buttons */}
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => setShowMaxBetConfirm(false)}
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      borderRadius: 8,
                      border: "none",
                      background: "#1e2d3d",
                      color: "#fff",
                      fontFamily: "Poppins, sans-serif",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setMaxBet(true);
                      setShowMaxBetConfirm(false);
                    }}
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      borderRadius: 8,
                      border: "none",
                      background: "#1a7fd4",
                      color: "#fff",
                      fontFamily: "Poppins, sans-serif",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    Enable
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
};
