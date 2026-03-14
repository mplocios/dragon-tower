import {
  ChevronDown as ChevronDownIcon,
  Maximize2 as Maximize2Icon,
  Menu as MenuIcon,
  Settings as SettingsIcon,
  Star as StarIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import DragonTower from "../../games/dragontower";

const navigationItems = [
  { icon: "🎰", label: "Casino", hasDropdown: true, badge: null },
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

export const Dragon = (): JSX.Element => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Sports"]);
  const [isDemo, setIsDemo] = useState(true);

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
                      className="flex items-center justify-between w-full px-6 py-3 text-white hover:bg-[#1a191d] transition-colors [font-family:'Inter',Helvetica] text-sm"
                      onClick={() => {
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
                            className="flex items-center gap-3 w-full px-6 py-3 pl-12 text-white hover:bg-[#1a191d] transition-colors [font-family:'Inter',Helvetica] text-sm"
                            onClick={() => setSidebarOpen(false)}
                          >
                            <span>{child.icon}</span>
                            <span>{child.label}</span>
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
        <div className="relative">
          <img
            className="absolute top-px right-0 w-[388px] h-[75px] hidden xl:block"
            alt="Header background"
            src="/header-background.png"
          />

          <div
            id="top-header"
            className="flex items-center justify-between px-4 lg:px-[22px] py-0 h-[75px] bg-[#020401] fixed top-0 left-0 right-0 z-30 lg:sticky"
          >
            <div className="flex items-center gap-2 lg:gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-white hover:bg-[#1a191d]"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <MenuIcon className="w-5 h-5" />
              </Button>

              <Button className="bg-[#eaff00] hover:bg-[#d4e600] text-black [font-family:'Poppins',Helvetica] font-semibold px-4 lg:px-8 py-2 rounded-lg text-xs lg:text-sm">
                🎰 Casino
              </Button>

              <Button
                variant="ghost"
                className="hidden sm:flex text-white hover:bg-[#1a191d] [font-family:'Poppins',Helvetica] font-semibold px-4 lg:px-8 py-2 rounded-lg text-xs lg:text-sm"
              >
                ⚽ Sports
              </Button>
            </div>

            <div className="flex items-center gap-2 lg:gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-[#1a191d] rounded-lg px-3 lg:px-4 py-2">
                <span className="text-white [font-family:'Poppins',Helvetica] text-xs lg:text-sm">
                  💰 USD 0.00
                </span>
              </div>

              <Button className="bg-[#eaff00] hover:bg-[#d4e600] text-black [font-family:'Poppins',Helvetica] font-semibold px-4 lg:px-6 py-2 rounded-lg text-xs lg:text-sm">
                💳 Deposit
              </Button>

              <div className="flex items-center gap-1 lg:gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:flex text-white hover:bg-[#1a191d] rounded-lg h-8 w-8 lg:h-9 lg:w-9"
                >
                  🔍
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-[#1a191d] rounded-lg h-8 w-8 lg:h-9 lg:w-9"
                >
                  👤
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:flex text-white hover:bg-[#1a191d] rounded-lg h-8 w-8 lg:h-9 lg:w-9"
                >
                  🔔
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden lg:flex text-white hover:bg-[#1a191d] rounded-lg h-8 w-8 lg:h-9 lg:w-9"
                >
                  🌐
                </Button>
              </div>
            </div>
          </div>
        </div>

        <header
          id="heads"
          className="flex items-center justify-between px-4 lg:px-[26px] py-4 bg-transparent mt-[75px] lg:mt-0"
        >
          <h1 className="[font-family:'Inter',Helvetica] font-bold text-white text-base lg:text-[17px]">
            Crash
          </h1>

          <div className="flex items-center gap-1 lg:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-[#1a191d] h-8 w-8 lg:h-9 lg:w-9"
            >
              <StarIcon className="w-4 h-4 lg:w-5 lg:h-5" />
            </Button>
            <span className="hidden sm:inline text-white text-xs lg:text-sm [font-family:'Poppins',Helvetica]">
              Add Favorite
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex text-white hover:bg-[#1a191d] h-8 w-8 lg:h-9 lg:w-9"
            >
              <Maximize2Icon className="w-4 h-4 lg:w-5 lg:h-5" />
            </Button>
            <div className="hidden md:flex items-center gap-2 bg-[#1a191d] rounded-full px-3 lg:px-4 py-1 ml-2">
              <span
                className={`text-xs lg:text-sm [font-family:'Poppins',Helvetica] font-medium ${isDemo ? "text-white" : "text-[#666]"}`}
              >
                Demo
              </span>
              <button
                onClick={() => setIsDemo(!isDemo)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isDemo ? "bg-[#eaff00]" : "bg-[#333]"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-[#020401] transition-transform ${
                    isDemo ? "translate-x-0.5" : "translate-x-5"
                  }`}
                />
              </button>
              <span
                className={`text-xs lg:text-sm [font-family:'Poppins',Helvetica] font-medium ${!isDemo ? "text-white" : "text-[#666]"}`}
              >
                Real
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-[#1a191d] h-8 w-8 lg:h-9 lg:w-9"
            >
              <SettingsIcon className="w-4 h-4 lg:w-5 lg:h-5" />
            </Button>
          </div>
        </header>

        <div
          id="game-component"
          className="flex-1 flex items-center justify-center lg:p-[15px]"
        >
          <div
            id="game-container"
            className="w-full h-full border border-[#333] rounded-2xl bg-[#0a0a0d]"
          >
            {/* dragontower component here */}
            <DragonTower />
          </div>
        </div>
      </main>
    </div>
  );
};
