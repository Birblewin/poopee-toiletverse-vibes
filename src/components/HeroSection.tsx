
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export const HeroSection = () => {
  const scrollToSneakPeek = () => {
    const sneakPeekSection = document.getElementById("sneak-peek");
    sneakPeekSection?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="min-h-screen flex flex-col items-center justify-center text-center px-4 relative pt-20 bg-gradient-to-b from-black via-gray-900 to-gray-800">
      {/* Main hero content */}
      <div className="z-10 space-y-8 max-w-4xl">
        <div>
          <h1 className="text-6xl md:text-8xl font-bold text-white drop-shadow-lg mb-4">
            💩 POOPEE 🦛
          </h1>
          <p className="text-2xl md:text-3xl text-gray-300 font-bold mb-2">
            The Hippo
          </p>
          <p className="text-lg md:text-xl text-gray-400 italic">
            "A Tropical Fatty's Joint"
          </p>
        </div>

        <div className="space-y-4 text-white text-lg md:text-xl max-w-2xl mx-auto">
          <p className="text-gray-300">
            Minted in a gas station toilet. 🚽
          </p>
          <p className="text-gray-300">
            Birthed by the Tropical Fatty's community. 🌴
          </p>
          <p className="text-gray-300">
            Launching wherever blockchains allow it. ⛓️
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-3xl md:text-4xl font-bold text-gray-300">
            Expect nothing. Receive less.
          </p>
          
          {/* Full-width image above the button */}
          <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mb-6">
            <img 
              src="/lovable-uploads/ed37bd4a-8be3-4640-8138-5b1ae0add67d.png" 
              alt="Tropical Fatty's Island with Poopee"
              className="w-full h-auto object-cover"
            />
          </div>
          
          <Button 
            onClick={scrollToSneakPeek}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-full text-xl transform hover:scale-105 transition-all duration-300 shadow-lg border border-gray-600"
          >
            Enter the Toiletverse 🚽
            <ChevronDown className="ml-2 animate-bounce" />
          </Button>
        </div>
      </div>
    </section>
  );
};
