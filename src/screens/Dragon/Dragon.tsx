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
import { MIN_BET, MAX_BET } from "../../games/dragontower/constants";
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
  const instantBet = useGameStore((s) => s.instantBet);
  const setInstantBet = useGameStore((s) => s.setInstantBet);
  const [showMaxBetConfirm, setShowMaxBetConfirm] = useState(false);
  const volume = useGameStore((s) => s.volume);
  const setVolume = useGameStore((s) => s.setVolume);
  const animations = useGameStore((s) => s.animations);
  const setAnimations = useGameStore((s) => s.setAnimations);
  const maxBet = useGameStore((s) => s.maxBet);
  const setMaxBet = useGameStore((s) => s.setMaxBet);
  const hotkeysEnabled = useGameStore((s) => s.hotkeysEnabled);
  const setHotkeysEnabled = useGameStore((s) => s.setHotkeysEnabled);
  const [showHotkeysModal, setShowHotkeysModal] = useState(false);
  const [showGameInfo, setShowGameInfo] = useState(false);
  const [gameInfoTab, setGameInfoTab] = useState<"rules" | "limits">("rules");
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
                      setShowSettings(false);
                      setShowGameInfo(true);
                      setGameInfoTab("rules");
                    }}
                  >
                    <span className="text-lg">📋</span>
                    <span className="[font-family:'Poppins',Helvetica] text-sm font-medium">
                      Game Info
                    </span>
                  </button>

                  {/* Hotkeys */}
                  <button
                    className={`flex items-center gap-3 w-full px-4 py-3 transition-colors ${hotkeysEnabled ? "bg-[#252525] text-[#eaff00]" : "text-white hover:bg-[#222]"}`}
                    onClick={() => setShowHotkeysModal(true)}
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
                  background: "#1A191D",
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
                    color: "#9ca3af",
                    fontFamily: "Poppins, sans-serif",
                    fontSize: 14,
                    marginBottom: 20,
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
                      background: "#100F13",
                      color: "#9ca3af",
                      fontFamily: "Poppins, sans-serif",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "pointer",
                      letterSpacing: 0.5,
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
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "pointer",
                      letterSpacing: 0.5,
                    }}
                  >
                    Enable
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ── Game Info Modal ── */}
      {showGameInfo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowGameInfo(false)}
        >
          <div
            style={{
              background: "#1A191D",
              borderRadius: 16,
              padding: "28px 32px",
              width: 420,
              maxWidth: "90%",
              boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>📋</span>
                <span
                  style={{
                    color: "#fff",
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  Game Info
                </span>
              </div>
              <button
                onClick={() => setShowGameInfo(false)}
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

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                background: "#100F13",
                borderRadius: 99,
                padding: 3,
                gap: 3,
                marginBottom: 20,
              }}
            >
              {(["rules", "limits"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setGameInfoTab(tab)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    border: "none",
                    borderRadius: 99,
                    fontFamily: "Poppins, sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: gameInfoTab === tab ? "#ffffff" : "transparent",
                    color: gameInfoTab === tab ? "#111200" : "#9ca3af",
                    transition: "all .18s",
                  }}
                >
                  {tab === "rules" ? "Rules" : "Max Betting Limits"}
                </button>
              ))}
            </div>

            {/* Rules Tab */}
            {gameInfoTab === "rules" && (
              <ol
                style={{
                  paddingLeft: 0,
                  margin: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {[
                  "Your selected difficulty level determines how the payout multiplier increases throughout the game.",
                  "Reveal tiles (eggs) to progressively increase your multiplier.",
                  "You can cash out at any time after revealing at least one safe tile to secure your winnings.",
                  "Selecting a losing tile will end the game immediately, and your bet will be forfeited.",
                  "The game consists of 9 rounds. Successfully completing all rounds yields the maximum possible payout.",
                ].map((rule, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      listStyle: "none",
                    }}
                  >
                    <span
                      style={{
                        color: "#eaff00",
                        fontFamily: "Poppins, sans-serif",
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                        minWidth: 18,
                      }}
                    >
                      {i + 1}.
                    </span>
                    <span
                      style={{
                        color: "#9ca3af",
                        fontFamily: "Poppins, sans-serif",
                        fontSize: 13,
                        lineHeight: 1.6,
                      }}
                    >
                      {rule}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {/* Limits Tab */}
            {gameInfoTab === "limits" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {[
                  { label: "Minimum Bet", value: `$${MIN_BET.toFixed(2)}` },
                  {
                    label: "Maximum Bet",
                    value: `$${MAX_BET.toLocaleString()}`,
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "#100F13",
                      borderRadius: 9,
                      padding: "12px 16px",
                      border: "1.5px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <span
                      style={{
                        color: "#9ca3af",
                        fontFamily: "Poppins, sans-serif",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </span>
                    <span
                      style={{
                        color: "#eaff00",
                        fontFamily: "Poppins, sans-serif",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Close button */}
            <button
              onClick={() => setShowGameInfo(false)}
              style={{
                width: "100%",
                marginTop: 24,
                padding: "12px 0",
                borderRadius: 8,
                border: "none",
                background: "#100F13",
                color: "#9ca3af",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                letterSpacing: 0.5,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Hotkeys Modal ── */}
      {showHotkeysModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowHotkeysModal(false)}
        >
          <div
            style={{
              background: "#1A191D",
              borderRadius: 16,
              padding: "28px 32px",
              width: 420,
              maxWidth: "90%",
              boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>⌨️</span>
                <span
                  style={{
                    color: "#fff",
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  Hotkeys
                </span>
              </div>
              <button
                onClick={() => setShowHotkeysModal(false)}
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

            {/* Warning */}
            <div
              style={{
                background: "#1A191D",
                border: "1px solid rgba(234, 179, 8, 0.3)",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16,
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1.4 }}>⚠️</span>
              <span
                style={{
                  color: "#eab308",
                  fontFamily: "Poppins, sans-serif",
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                Enabling keyboard shortcuts may cause conflicts with browser
                shortcuts or other extensions. Use at your own discretion.
              </span>
            </div>

            {/* Keybindings list */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 24,
              }}
            >
              {[
                { key: "1", desc: "Pick tile number 1 in current row" },
                { key: "2", desc: "Pick tile number 2 in current row" },
                { key: "3", desc: "Pick tile number 3 in current row" },
                { key: "4", desc: "Pick tile number 4 in current row" },
                { key: "space", desc: "Make a bet" },
                { key: "s", desc: "Double bet amount" },
                { key: "a", desc: "Halve bet amount" },
                { key: "d", desc: "Zero bet amount" },
                { key: "q", desc: "Random Pick" },
                { key: "w", desc: "Cashout" },
                {
                  key: "r",
                  desc: "undo tile selection the current round (autobetting only)",
                },
              ].map(({ key, desc }) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      color: "#aaa",
                      fontFamily: "Poppins, sans-serif",
                      fontSize: 13,
                    }}
                  >
                    {desc}
                  </span>
                  <span
                    style={{
                      background: "#33333A",
                      color: "#e0e0e0",
                      fontFamily: "Poppins, sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "4px 12px",
                      borderRadius: 6,
                      minWidth: 40,
                      textAlign: "center",
                    }}
                  >
                    {key}
                  </span>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowHotkeysModal(false)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 8,
                  border: "none",
                  background: "#100F13",
                  color: "#9ca3af",
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  letterSpacing: 0.5,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setHotkeysEnabled(!hotkeysEnabled);
                  setShowHotkeysModal(false);
                }}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 8,
                  border: "none",
                  background: hotkeysEnabled
                    ? "linear-gradient(135deg, #7a1414, #4a0a0a)"
                    : "linear-gradient(135deg, #a8c000, #eaff00)",
                  color: hotkeysEnabled ? "#ffaaaa" : "#111200",
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  letterSpacing: 0.5,
                }}
              >
                {hotkeysEnabled ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
