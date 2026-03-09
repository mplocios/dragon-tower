import { ChevronDown as ChevronDownIcon, Maximize2 as Maximize2Icon, Menu as MenuIcon, Settings as SettingsIcon, Star as StarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import { DragonTowerGame } from "../../components/DragonTowerGame";

const navigationItems = [
  { icon: "🎰", label: "Casino", hasDropdown: true },
  { icon: "⚽", label: "Sports", hasDropdown: true },
  { icon: "🏟", label: "Sports Lobby" },
  { icon: "▶", label: "In-Play" },
  { icon: "📅", label: "Upcoming" },
  { icon: "📊", label: "Outright" },
  { icon: "🗺", label: "Roadmap" },
  { icon: "🎁", label: "Promotions" },
  { icon: "🤝", label: "Affiliate" },
  { icon: "❓", label: "FAQ" },
];

export const Dragon = (): JSX.Element => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="bg-[#020401] w-full min-h-screen flex flex-col lg:flex-row">
      <aside className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 fixed lg:sticky top-0 left-0 w-[251px] h-screen bg-[#020401] border-r border-[#1d1d1d] flex flex-col z-50 transition-transform duration-300 lg:z-40`}>
        <div className="pt-[75px]">
          <ScrollArea className="h-[calc(100vh-75px)]">
            <nav className="flex flex-col">
              {navigationItems.map((item, index) => (
                <button
                  key={index}
                  className="flex items-center justify-between px-6 py-3 text-white hover:bg-[#1a191d] transition-colors [font-family:'Inter',Helvetica] text-sm"
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="flex items-center gap-3">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.hasDropdown && <ChevronDownIcon className="w-4 h-4" />}
                </button>
              ))}
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

          <div className="flex items-center justify-between px-4 lg:px-[22px] py-0 h-[75px] bg-[#020401] fixed top-0 left-0 right-0 z-30 lg:sticky">
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

        <header className="flex items-center justify-between px-4 lg:px-[26px] py-4 bg-transparent mt-[75px] lg:mt-0">
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
            <span className="hidden md:inline text-white text-xs lg:text-sm [font-family:'Poppins',Helvetica]">
              Demo
            </span>
            <div className="flex items-center gap-2 bg-[#1a191d] rounded-full px-2 lg:px-3 py-1">
              <span className="text-white text-xs lg:text-sm">🟢</span>
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

        <div className="flex flex-col items-center gap-3 lg:gap-[15px] p-3 lg:p-[15px]">
          <DragonTowerGame />
        </div>
      </main>
    </div>
  );
};
