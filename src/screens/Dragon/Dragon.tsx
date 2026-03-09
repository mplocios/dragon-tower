import {
  ChevronDownIcon,
  Maximize2Icon,
  MenuIcon,
  SettingsIcon,
  StarIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ScrollArea } from "../../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";

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
          <div className="flex flex-col xl:flex-row items-center justify-center gap-3 lg:gap-[15px] p-3 lg:p-[15px] w-full bg-[#1a191d] rounded-[20px] border border-[#28272d]">
            <div className="w-full xl:hidden">
              <div className="w-full aspect-[4/3] min-h-[250px]">
                <img
                  className="w-full h-full object-cover rounded-lg"
                  alt="Game"
                  src="/game.svg"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:gap-[15px] w-full xl:flex-1 xl:max-w-md">
              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="w-full h-[44px] lg:h-[52px] bg-[#0f0e12] rounded-[48px] p-1.5">
                  <TabsTrigger
                    value="manual"
                    className="flex-1 bg-[#282a2f] data-[state=active]:bg-[#282a2f] rounded-full [font-family:'Poppins',Helvetica] font-semibold text-white text-sm lg:text-base"
                  >
                    Manual
                  </TabsTrigger>
                  <TabsTrigger
                    value="auto"
                    className="flex-1 opacity-50 data-[state=active]:opacity-100 rounded-full [font-family:'Poppins',Helvetica] font-semibold text-white text-sm lg:text-base"
                  >
                    Auto
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <ScrollArea className="max-h-none xl:max-h-[430px]">
                <div className="flex flex-col gap-3 lg:gap-4 pr-2">
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between pb-1">
                      <Label className="[font-family:'Poppins',Helvetica] font-semibold text-[#b4b4b4] text-xs lg:text-sm">
                        Total Bet
                      </Label>
                      <span className="[font-family:'Poppins',Helvetica] font-bold text-[#b4b4b4] text-xs lg:text-sm">
                        $0.00
                      </span>
                    </div>

                    <div className="flex items-stretch bg-[#ffffff01] rounded-lg shadow-[0px_1px_2px_#0000001f,0px_1px_3px_#00000033]">
                      <div className="flex-1 relative">
                        <Input
                          defaultValue="0,00000000"
                          className="bg-[#0f0e12] border-2 border-[#282a2f] rounded-l-lg [font-family:'Poppins',Helvetica] font-bold text-white text-sm lg:text-base h-auto py-2 lg:py-2.5 pr-12"
                        />
                        <img
                          className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 lg:w-5 lg:h-5"
                          alt="Container"
                          src="/container-1.svg"
                        />
                      </div>

                      <Button className="bg-[#282a2f] hover:bg-[#33333a] text-white [font-family:'Poppins',Helvetica] font-semibold rounded-none px-3 lg:px-4 text-sm lg:text-base">
                        ½
                      </Button>

                      <Button className="bg-[#282a2f] hover:bg-[#33333a] text-white [font-family:'Poppins',Helvetica] font-semibold rounded-r-lg px-3 lg:px-4 border-l-2 border-[#0f0e12] text-sm lg:text-base">
                        2×
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col">
                      <Label className="pb-1 [font-family:'Poppins',Helvetica] font-semibold text-[#b4b4b4] text-xs lg:text-sm">
                        Difficulty
                      </Label>

                      <div className="relative">
                        <Select defaultValue="medium">
                          <SelectTrigger className="bg-[#0f0e12] border-2 border-[#282a2f] rounded-lg [font-family:'Poppins',Helvetica] font-semibold text-white text-sm lg:text-base shadow-[0px_1px_2px_#0000001f,0px_1px_3px_#00000033]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full bg-[#eaff00] hover:bg-[#d4e600] text-[#05080a] [font-family:'Poppins',Helvetica] font-semibold text-sm lg:text-base py-2 lg:py-2.5 rounded-lg shadow-[0px_2px_4px_-2px_#0000001a,0px_4px_6px_-1px_#0000001a]">
                    Bet
                  </Button>

                  <Button
                    disabled
                    className="w-full bg-[#33333a] text-white [font-family:'Poppins',Helvetica] font-semibold text-sm lg:text-base py-2 lg:py-2.5 rounded-lg shadow-[0px_2px_4px_-2px_#0000001a,0px_4px_6px_-1px_#0000001a] opacity-50"
                  >
                    Random Pick
                  </Button>

                  <div className="flex flex-col">
                    <div className="flex items-center justify-between pb-1">
                      <Label className="[font-family:'Poppins',Helvetica] font-semibold text-[#b4b4b4] text-xs lg:text-sm">
                        Total Profit (0.00×)
                      </Label>
                      <span className="[font-family:'Poppins',Helvetica] font-normal text-[#b4b4b4] text-xs lg:text-sm">
                        $0.00
                      </span>
                    </div>

                    <div className="relative">
                      <Input
                        defaultValue="0.00000000"
                        disabled
                        className="bg-[#33333a] border-2 border-transparent rounded-lg [font-family:'Poppins',Helvetica] font-normal text-white text-sm lg:text-base py-2 lg:py-2.5 pr-12 shadow-[0px_1px_2px_#0000001f,0px_1px_3px_#00000033]"
                      />
                      <img
                        className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 lg:w-5 lg:h-5"
                        alt="Container"
                        src="/container-1.svg"
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>

            <div className="hidden xl:block w-full xl:w-[790px] xl:h-[649px]">
              <img
                className="w-full h-full object-cover rounded-lg"
                alt="Game"
                src="/game.svg"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
