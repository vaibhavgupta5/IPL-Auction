import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../firebase/firebase";
import { query, where, getDocs, collection, doc, updateDoc, getDoc } from "firebase/firestore";
import PageMeta from "../components/common/PageMeta";

interface Player {
  id: string;
  name: string;
  basePrice: number;
  imageUrl: string;
  role: string;
  isOverseas: boolean;
  status: string;
  soldTo: string;
  soldPrice: number;
  credits: number;
  year: number;
  
  // Batting stats
  ballsFaced: number;
  battingAverage: number;
  battingCenturies: number;
  battingHalfCenturies: number;
  battingHighScore: number;
  battingMatches: number;
  battingNotOuts: number;
  battingRuns: number;
  battingStrikeRate: number;
  fours: number;
  sixes: number;
  catches: number;
  stumpings: number;
  
  // Bowling stats
  ballsBowled: number;
  bowlingAverage: number;
  bowlingMatches: number;
  bowlingStrikeRate: number;
  bestBowling: string;
  economy: number;
  fiveWicketHauls: number;
  fourWicketHauls: number;
  runsConceded: number;
  wickets: number;
}

interface FirebaseTeam {
  id: string;
  name: string;
  amount: string;
  number: number;
  overseas: number;
  players: string[];
}

interface DisplayTeam {
  id: string;
  name: string;
  amount: string;
  number: number;
  overseas: number;
  players: string[];
  color: string;
  shortName: string;
}

export default function AuctionPage() {
  // Player and auction state
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<DisplayTeam[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentBid, setCurrentBid] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState("");
  const [soldPrice, setSoldPrice] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [showSoldBanner, setShowSoldBanner] = useState(false);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [teamValidationError, setTeamValidationError] = useState<string>("");
  
  // Team colors mapping
  const teamColors = useMemo(() => [
    { color: "#004BA0", secondaryColor: "#D1AB3E" },
    { color: "#FFFF3C", secondaryColor: "#F25C19" },
    { color: "#D5000B", secondaryColor: "#000000" },
    { color: "#3A225D", secondaryColor: "#B3A123" },
    { color: "#0078BC", secondaryColor: "#EF1B23" },
    { color: "#E01E26", secondaryColor: "#A7A9AC" },
    { color: "#FF7A15", secondaryColor: "#000000" },
    { color: "#EA1A85", secondaryColor: "#254AA5" },
    { color: "#1C1C1C", secondaryColor: "#0B4973" },
    { color: "#A72056", secondaryColor: "#FFCC00" }
  ], []);


  const formatPrice = (price: number) => {
    if (price >= 1) {
      return `${price.toFixed(2)} Cr`;
    } else {
      return `${(price * 100).toFixed(2)} Lakh`;
    }
  };
  
  
  // const formatPriceWithBothUnits = (price: number) => {
  //   if (price >= 1) {
  //     return `${price} Cr (${price * 100} Lakh)`;
  //   } else {
  //     return `${price * 100} Lakh (${price} Cr)`;
  //   }
  // };

  useEffect(() => {
    const fetchPlayers = async () => {
        try {
          setLoading(true);
          const q = query(collection(db, "players"), where("status", "==", "UNSOLD"));
          const querySnapshot = await getDocs(q);
          const playersList = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || "",
              basePrice: data.basePrice || 0,
              imageUrl: data.imageUrl || "",
              role: data.role || "",
              isOverseas: data.isOverseas || false,
              status: data.status || "UNSOLD",
              soldTo: data.soldTo || "",
              soldPrice: data.soldPrice || 0,
              credits: data.credits || 0,
              year: data.year || 2025,
              
              // Batting stats
              ballsFaced: data.ballsFaced || 0,
              battingAverage: data.battingAverage || 0,
              battingCenturies: data.battingCenturies || 0,
              battingHalfCenturies: data.battingHalfCenturies || 0,
              battingHighScore: data.battingHighScore || 0,
              battingMatches: data.battingMatches || 0,
              battingNotOuts: data.battingNotOuts || 0,
              battingRuns: data.battingRuns || 0,
              battingStrikeRate: data.battingStrikeRate || 0,
              fours: data.fours || 0,
              sixes: data.sixes || 0,
              catches: data.catches || 0,
              stumpings: data.stumpings || 0,
              
              // Bowling stats
              ballsBowled: data.ballsBowled || 0,
              bowlingAverage: data.bowlingAverage || 0,
              bowlingMatches: data.bowlingMatches || data.battingMatches,
              bowlingStrikeRate: data.bowlingStrikeRate || 0,
              bestBowling: data.bestBowling || "-",
              economy: data.economy || 0,
              fiveWicketHauls: data.fiveWicketHauls || 0,
              fourWicketHauls: data.fourWicketHauls || 0,
              runsConceded: data.runsConceded || 0,
              wickets: data.wickets || 0
            } as Player;
          });
      
          // Sort players by role (Batters > Bowlers > All-Rounders > Others)
          const sortedPlayers = playersList.sort((a, b) => {
            const rolePriority = {
              "Batter": 1,
              "Bowler": 2,
              "All-Rounder": 3,
              "Wicketkeeper": 4
            };
      
            const aPriority = rolePriority[a.role] || 99;
            const bPriority = rolePriority[b.role] || 99;
      
            // If same priority, sort alphabetically by name
            if (aPriority === bPriority) {
              return a.name.localeCompare(b.name);
            }
      
            return aPriority - bPriority;
          });
      
          setPlayers(sortedPlayers);
          setLoading(false);
        } catch (error) {
          console.error("Failed to fetch players:", error);
          setLoading(false);
        }
      };    
    const fetchTeams = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "teams"));
        const teamsList = querySnapshot.docs.map((doc, index) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            amount: data.amount,
            number: data.number,
            overseas: data.overseas,
            players: data.players || [],
            color: teamColors[index]?.color || "#000000",
            secondaryColor: teamColors[index]?.secondaryColor || "#FFFFFF",
            shortName: data.shortName || data.name.substring(0, 3).toUpperCase()
          };
        });
        setTeams(teamsList);
      } catch (error) {
        console.error("Failed to fetch teams:", error);
      }
    };

    fetchPlayers();
    fetchTeams();
  }, [teamColors]);

  const getBidIncrement = () => {
    if (currentBid < 1) return 0.1; // 10 lakhs
    if (currentBid < 2) return 0.25; // 25 lakhs
    return 0.5; // 50 lakhs
  };

  const startBidding = () => {
    const basePrice = currentPlayer?.basePrice || 20;
    setCurrentBid(basePrice);
  };

  const selectTeam = (teamId: string) => {
    setSelectedTeam(teamId);
  };

  const incrementBid = () => {
    setCurrentBid(prev => prev + getBidIncrement());
  };

  const handleSold = () => {
    setConfirmationAction("SOLD");
    setSoldPrice(currentBid);
    setShowTeamSelection(true);
  };

  const confirmSold = () => {
    if (selectedTeam) {
      setShowTeamSelection(false);
      setShowConfirmation(true);
    } else {
      setTeamValidationError("Please select a team before confirming");
    }
  };

  const handleUnsold = () => {
    setConfirmationAction("UNSOLD");
    setShowConfirmation(true);
  };

  const confirmAction = async () => {
    try {
      const playerRef = doc(db, "players", currentPlayer.id);
      
      // First check if this is a SOLD action and we have a selected team
      if (confirmationAction === "SOLD" && selectedTeam) {
        const teamRef = doc(db, "teams", selectedTeam);
        const teamSnap = await getDoc(teamRef);
        
        if (!teamSnap.exists()) {
          throw new Error("Selected team doesn't exist");
        }
        
        const teamData = teamSnap.data() as FirebaseTeam;
        
        // Check overseas player limit
        if (currentPlayer.isOverseas && teamData.overseas >= 4) {
          alert("This team already has 4 overseas players. Cannot add more.");
          setShowConfirmation(false);
          return;
        }
        
        // Check if team has enough budget



        const teamAmount = parseInt(teamData.amount) * 100;
        const soldPriceInLakhs = soldPrice * 100; // Convert crores to lakhs
        
        console.log(teamAmount)
        console.log(soldPriceInLakhs)

        if (teamAmount < soldPriceInLakhs) {
          alert("This team doesn't have enough budget for this player");
          setShowConfirmation(false);
          return;
        }
        
        // Update team data
        await updateDoc(teamRef, {
          amount: (teamAmount - soldPriceInLakhs).toString(),
          players: [...teamData.players, playerRef], // Add player reference to team's players array
          overseas: currentPlayer.isOverseas ? teamData.overseas + 1 : teamData.overseas
        });
      }
      
      // Update player data
      await updateDoc(playerRef, {
        status: confirmationAction,
        soldPrice: confirmationAction === "SOLD" ? soldPrice : 0,
        soldTo: confirmationAction === "SOLD" ? selectedTeam : ""
      });
      
      setShowConfirmation(false);
      
      if (confirmationAction === "SOLD") {
        setShowSoldBanner(true);
        
        // Auto-advance after 3 seconds
        setTimeout(() => {
          setShowSoldBanner(false);
          nextPlayer();
        }, 3000);
      } else {
        nextPlayer();
      }
      
      // Refresh teams data to reflect changes
      const querySnapshot = await getDocs(collection(db, "teams"));
      const teamsList = querySnapshot.docs.map((doc, index) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          amount: data.amount,
          number: data.number,
          overseas: data.overseas,
          players: data.players || [],
          color: teamColors[index]?.color || "#000000",
          secondaryColor: teamColors[index]?.secondaryColor || "#FFFFFF",
          shortName: data.shortName || data.name.substring(0, 3).toUpperCase()
        };
      });
      setTeams(teamsList);
      
    } catch (error) {
      console.error("Failed to update player/team status:", error);
      alert("An error occurred while processing the transaction");
      setShowConfirmation(false);
    }
  };

  const nextPlayer = () => {
    if (index < players.length - 1) {
      setIndex(index + 1);
    } else {
      setIndex(0); // Cycle back to first player
    }
    resetAuctionState();
  };

  console.log("hi")

  const prevPlayer = () => {
    if (index > 0) {
      setIndex(index - 1);
    } else {
      setIndex(players.length - 1); // Cycle to last player
    }
    resetAuctionState();
  };

  const resetAuctionState = () => {
    setCurrentBid(0);
    setSelectedTeam("");
    setShowTeamSelection(false);
    setTeamValidationError("");
  };

  const currentPlayer = players[index];
  const selectedTeamData = teams.find(team => team.id === selectedTeam);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-b from-blue-900 to-blue-800">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center"
        >
          <img src="https://imgs.search.brave.com/No-nlmkQDzwOgZOTs1wPz30Srqm4PRVscF4TUCQ-T4o/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzLzhmL2Fh/LzU1LzhmYWE1NWQ4/ZDRjNWUwNzg5Mjlm/MWIwZjBmOTdkZTc5/LmpwZw" alt="IPL Logo" className="w-40 z-50 h-40 mb-8" />
          <div className="w-80 h-6 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
              animate={{ width: ["0%", "100%", "0%"] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
          <p className="mt-6 text-3xl font-bold text-white">Loading Auction Dashboard...</p>
        </motion.div>
      </div>
    );
  }

  // No players available
  if (!currentPlayer) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-b from-blue-900 to-blue-800">
        <div className="text-center p-12 bg-white rounded-xl shadow-2xl">
          <h2 className="text-4xl font-bold text-red-600 mb-4">No players available</h2>
          <p className="text-xl text-gray-700">All players have been auctioned</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-800 text-white overflow-hidden">
      <PageMeta title="IPL Auction Dashboard" description="IPL Player Auction Dashboard" />
      

      

      
      {/* SOLD Banner */}
      <AnimatePresence>
        {showSoldBanner && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="relative">
              <div 
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black text-9xl font-extrabold px-24 py-12 rounded-xl transform rotate-6 shadow-2xl"
                style={{ textShadow: "3px 3px 0 rgba(0,0,0,0.2)" }}
              >
                SOLD!
              </div>
              <div 
                className="absolute bottom-0 left-0 right-0 transform translate-y-full mt-8 text-center"
                style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
              >
                <p className="text-5xl font-bold text-white">
                  {selectedTeamData?.name} • ₹{soldPrice} Crores
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Team Selection Modal */}
      <AnimatePresence>
        {showTeamSelection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-80 z-40 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl p-8 max-w-4xl w-full shadow-2xl"
            >
              <h3 className="text-3xl font-bold text-center mb-8 text-yellow-400">
                Select Team for {currentPlayer.name}
              </h3>
              
              {teamValidationError && (
                <div className="bg-red-900 bg-opacity-60 text-white p-4 rounded-lg mb-6 text-center">
                  {teamValidationError}
                </div>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {teams.map((team) => (
                  <motion.div
                    key={team.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => selectTeam(team.id)}
                    className={`cursor-pointer rounded-xl p-4 flex flex-col items-center ${
                      selectedTeam === team.id 
                        ? "ring-4 ring-yellow-400 bg-gray-800" 
                        : "bg-gray-800 hover:bg-gray-700"
                    }`}
                  >
                    <div 
                      className="w-12 h-12 rounded-full mb-2 flex items-center justify-center text-white text-xl font-bold"
                      style={{ backgroundColor: team.color === "#FFFF3C" ? "#F25C19" : team.color }}
                    >
                      {team.shortName}
                    </div>
                    <span className="font-bold text-sm text-center text-white">
                      {team.name}
                    </span>
                    <div className="mt-2 text-xs text-gray-300">
                      <div>Budget: ₹{(parseInt(team.amount)/10000000).toFixed(1)}Cr</div>
                      <div>Overseas: {team.overseas}/4</div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <div className="text-center mb-8">
                <p className="text-2xl mb-2">Final Bid Amount</p>
                <p className="text-4xl font-bold text-green-400">₹{formatPrice(currentBid || 20)}</p>  
              </div>
              
              <div className="flex justify-center gap-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-8 py-3 ${selectedTeam ? 'bg-green-600' : 'bg-gray-500'} text-white text-xl font-bold rounded-xl`}
                  onClick={confirmSold}
                  disabled={!selectedTeam}
                >
                  Confirm Selection
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 bg-gray-600 text-white text-xl font-bold rounded-xl"
                  onClick={() => setShowTeamSelection(false)}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-80 z-40 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-3xl font-bold text-center mb-6">
                Confirm {confirmationAction}
              </h3>
              <p className="text-xl text-center mb-8">
                Are you sure you want to mark <span className="font-bold">{currentPlayer.name}</span> as {confirmationAction}?
                {confirmationAction === "SOLD" && (
                  <span> to {selectedTeamData?.name} for ₹{formatPrice(soldPrice || 20)}?</span>
                )}
              </p>
              
              <div className="flex justify-center gap-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-8 py-3 ${
                    confirmationAction === "SOLD" ? "bg-green-600" : "bg-red-600"
                  } text-white text-xl font-bold rounded-xl`}
                  onClick={confirmAction}
                >
                  Confirm
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 bg-gray-600 text-white text-xl font-bold rounded-xl"
                  onClick={() => setShowConfirmation(false)}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-6 flex flex-col min-h-screen">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-7 gap-6">
          {/* Player Navigation Controls */}
          <div className="lg:col-span-7 flex justify-between mb-4">
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={prevPlayer}
                className="p-2 bg-gray-800 text-white rounded-full flex items-center justify-center w-10 h-10 shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
              <div className="text-lg font-medium bg-gray-800 px-3 py-1 rounded-full">
                {index + 1} / {players.length}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={nextPlayer}
                className="p-2 bg-gray-800 text-white rounded-full flex items-center justify-center w-10 h-10 shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            </div>
            <div className="flex items-center">
              <motion.img 
                src="https://imgs.search.brave.com/No-nlmkQDzwOgZOTs1wPz30Srqm4PRVscF4TUCQ-T4o/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzLzhmL2Fh/LzU1LzhmYWE1NWQ4/ZDRjNWUwNzg5Mjlm/MWIwZjBmOTdkZTc5/LmpwZw" 
                alt="IPL Logo" 
                className="h-12" 
                whileHover={{ rotate: 10 }}
              />
            </div>
          </div>
          
       {/* Player Profile Image */}
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="lg:col-span-3 flex flex-col items-center"
>
  <div className="relative w-full h-full flex flex-col items-center">
    {/* Player Image */}
    <motion.div
      className="w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden border-8 border-gradient-to-r from-blue-600 to-purple-600 shadow-2xl mb-6 relative"
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Glow effect behind image */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-70 blur-md"></div>
      
      <div className="relative w-full h-full rounded-full overflow-hidden">
        <img
          src={currentPlayer.imageUrl || "/player-placeholder.png"}
          alt={currentPlayer.name}
          className="w-full h-full object-cover"
        />
      </div>
    </motion.div>
    
    {/* Player Name and Base Info */}
    <h2 className="text-5xl font-bold mb-4 text-white text-center text-shadow-lg bg-clip-text bg-gradient-to-r from-white to-blue-100">
      {currentPlayer.name}
    </h2>
    
    <div className="flex justify-center gap-4 mb-4">
      <span className="bg-gradient-to-r from-blue-700 to-blue-500 text-white px-5 py-2 rounded-full text-xl font-bold shadow-lg transform hover:scale-105 transition duration-200">
        {currentPlayer.role}
      </span>
      <span className={`${currentPlayer.isOverseas ? "bg-gradient-to-r from-purple-700 to-purple-500" : "bg-gradient-to-r from-green-700 to-green-500"} text-white px-5 py-2 rounded-full text-xl font-bold shadow-lg transform hover:scale-105 transition duration-200`}>
        {currentPlayer.isOverseas ? "Overseas" : "Indian"}
      </span>
    </div>
    
    {/* Base Price Tag */}
    <div className="bg-gradient-to-r from-yellow-600 to-yellow-400 text-black py-3 px-8 rounded-full font-bold text-xl shadow-lg mt-2 transform hover:scale-105 transition duration-200">
      Base Price: ₹{formatPrice(currentPlayer.basePrice || 20)}
    </div>
    
    {/* Career Stats Preview */}
    <div className="grid grid-cols-2 gap-6 mt-8 w-full max-w-md">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl text-center shadow-lg transform hover:translate-y-1 transition duration-200">
        <p className="text-gray-300 text-sm font-medium">Matches</p>
        <p className="text-3xl font-bold text-white mt-1">{currentPlayer.battingMatches}</p>
      </div>
      
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl text-center shadow-lg transform hover:translate-y-1 transition duration-200">
        <p className="text-gray-300 text-sm font-medium">Runs</p>
        <p className="text-3xl font-bold text-white mt-1">{currentPlayer.battingRuns}</p>
      </div>
      
      {currentPlayer.wickets > 0 && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl text-center shadow-lg transform hover:translate-y-1 transition duration-200">
          <p className="text-gray-300 text-sm font-medium">Wickets</p>
          <p className="text-3xl font-bold text-white mt-1">{currentPlayer.wickets}</p>
        </div>
      )}
      
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl text-center shadow-lg transform hover:translate-y-1 transition duration-200">
        <p className="text-gray-300 text-sm font-medium">High Score</p>
        <p className="text-3xl font-bold text-white mt-1">{currentPlayer.battingHighScore}</p>
      </div>
    </div>
  </div>
</motion.div>
          
          {/* Stats & Bidding Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.2 } }}
            className="lg:col-span-4"
          >
            <div className="grid grid-cols-1 gap-6 h-full">
{/* Player Stats */}
<div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl shadow-xl p-6">
  <h2 className="text-2xl font-bold mb-4 text-white flex items-center">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
    Player Statistics
  </h2>
  
  {/* Dynamic grid based on player role */}
  <div className={`grid ${currentPlayer.role.toLowerCase().includes("bowler") || 
    (currentPlayer.role.toLowerCase().includes("all-rounder") && currentPlayer.wickets > 0) ? 
    'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-4`}>
    
    {/* Batting Stats - Always show for all players */}
    <div>
      <div className="flex items-center mb-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-blue-400">Batting</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-900 bg-opacity-50 p-3 rounded-lg">
          <p className="text-blue-300 text-sm">Matches</p>
          <p className="text-xl font-bold text-white">{currentPlayer.battingMatches}</p>
        </div>
        
        <div className="bg-blue-900 bg-opacity-50 p-3 rounded-lg">
          <p className="text-blue-300 text-sm">Runs</p>
          <p className="text-xl font-bold text-white">{currentPlayer.battingRuns}</p>
        </div>
        
        <div className="bg-blue-900 bg-opacity-50 p-3 rounded-lg">
          <p className="text-blue-300 text-sm">Average</p>
          <p className="text-xl font-bold text-white">{currentPlayer.battingAverage}</p>
        </div>
        
        <div className="bg-blue-900 bg-opacity-50 p-3 rounded-lg">
          <p className="text-blue-300 text-sm">Strike Rate</p>
          <p className="text-xl font-bold text-white">{currentPlayer.battingStrikeRate}</p>
        </div>
        
        <div className="bg-blue-900 bg-opacity-50 p-3 rounded-lg">
          <p className="text-blue-300 text-sm">High Score</p>
          <p className="text-xl font-bold text-white">{currentPlayer.battingHighScore}</p>
        </div>
        
        <div className="bg-blue-900 bg-opacity-50 p-3 rounded-lg">
          <p className="text-blue-300 text-sm">Not Outs</p>
          <p className="text-xl font-bold text-white">{currentPlayer.battingNotOuts}</p>
        </div>
        
        {currentPlayer.battingCenturies > 0 && (
          <div className="bg-blue-900 bg-opacity-50 p-3 rounded-lg">
            <p className="text-blue-300 text-sm">Centuries</p>
            <p className="text-xl font-bold text-white">{currentPlayer.battingCenturies}</p>
          </div>
        )}
        
        {currentPlayer.battingHalfCenturies > 0 && (
          <div className="bg-blue-900 bg-opacity-50 p-3 rounded-lg">
            <p className="text-blue-300 text-sm">50s</p>
            <p className="text-xl font-bold text-white">{currentPlayer.battingHalfCenturies}</p>
          </div>
        )}
        
        <div className="bg-blue-900 bg-opacity-50 p-3 rounded-lg">
          <p className="text-blue-300 text-sm">Fours</p>
          <p className="text-xl font-bold text-white">{currentPlayer.fours}</p>
        </div>
        
        <div className="bg-blue-900 bg-opacity-50 p-3 rounded-lg">
          <p className="text-blue-300 text-sm">Sixes</p>
          <p className="text-xl font-bold text-white">{currentPlayer.sixes}</p>
        </div>
    
      </div>
    </div>
    
    {/* Bowling Stats - Only show for bowlers/all-rounders with wickets */}
    {(currentPlayer.role.toLowerCase().includes("bowler") || 
      (currentPlayer.role.toLowerCase().includes("all-rounder") && currentPlayer.wickets > 0)) && (
      <div>
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-red-400">Bowling</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-900 bg-opacity-50 p-3 rounded-lg">
            <p className="text-red-300 text-sm">Matches</p>
            <p className="text-xl font-bold text-white">{currentPlayer.bowlingMatches}</p>
          </div>
          
          <div className="bg-red-900 bg-opacity-50 p-3 rounded-lg">
            <p className="text-red-300 text-sm">Wickets</p>
            <p className="text-xl font-bold text-white">{currentPlayer.wickets}</p>
          </div>
          
          <div className="bg-red-900 bg-opacity-50 p-3 rounded-lg">
            <p className="text-red-300 text-sm">Average</p>
            <p className="text-xl font-bold text-white">
              {currentPlayer.bowlingAverage > 0 ? currentPlayer.bowlingAverage : '-'}
            </p>
          </div>
          
          <div className="bg-red-900 bg-opacity-50 p-3 rounded-lg">
            <p className="text-red-300 text-sm">Economy</p>
            <p className="text-xl font-bold text-white">{currentPlayer.economy}</p>
          </div>
          
          <div className="bg-red-900 bg-opacity-50 p-3 rounded-lg">
            <p className="text-red-300 text-sm">Strike Rate</p>
            <p className="text-xl font-bold text-white">
              {currentPlayer.bowlingStrikeRate > 0 ? currentPlayer.bowlingStrikeRate : '-'}
            </p>
          </div>
          
          <div className="bg-red-900 bg-opacity-50 p-3 rounded-lg">
            <p className="text-red-300 text-sm">Best Figures</p>
            <p className="text-xl font-bold text-white">{currentPlayer.bestBowling}</p>
          </div>
          
          <div className="bg-red-900 bg-opacity-50 p-3 rounded-lg">
            <p className="text-red-300 text-sm">Balls Bowled</p>
            <p className="text-xl font-bold text-white">{currentPlayer.ballsBowled}</p>
          </div>
          
          <div className="bg-red-900 bg-opacity-50 p-3 rounded-lg">
            <p className="text-red-300 text-sm">Runs Conceded</p>
            <p className="text-xl font-bold text-white">{currentPlayer.runsConceded}</p>
          </div>
          
          {currentPlayer.fourWicketHauls > 0 && (
            <div className="bg-red-900 bg-opacity-50 p-3 rounded-lg">
              <p className="text-red-300 text-sm">4+ Wickets</p>
              <p className="text-xl font-bold text-white">{currentPlayer.fourWicketHauls}</p>
            </div>
          )}
          
          {currentPlayer.fiveWicketHauls > 0 && (
            <div className="bg-red-900 bg-opacity-50 p-3 rounded-lg">
              <p className="text-red-300 text-sm">5+ Wickets</p>
              <p className="text-xl font-bold text-white">{currentPlayer.fiveWicketHauls}</p>
            </div>
          )}
        </div>
      </div>
    )}
    
    {/* Fielding Stats - Full width for batsmen, half for others */}
    <div className={`${!(currentPlayer.role.toLowerCase().includes("bowler") || 
      (currentPlayer.role.toLowerCase().includes("all-rounder") && currentPlayer.wickets > 0)) ? 
      'col-span-1' : 'lg:col-span-2'}`}>
      <div className="flex items-center mb-3">
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-green-400">Fielding</h3>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-green-900 bg-opacity-50 p-3 rounded-lg">
          <p className="text-green-300 text-sm">Catches</p>
          <p className="text-xl font-bold text-white">{currentPlayer.catches}</p>
        </div>
        
        {currentPlayer.stumpings > 0 && (
          <div className="bg-green-900 bg-opacity-50 p-3 rounded-lg">
            <p className="text-green-300 text-sm">Stumpings</p>
            <p className="text-xl font-bold text-white">{currentPlayer.stumpings}</p>
          </div>
        )}
      </div>
    </div>
  </div>
</div>
              
              {/* Bidding Section */}
              <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl shadow-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Auction Control
                  </h2>
                  
                  {currentBid > 0 && (
                    <div className="bg-gray-800 rounded-lg px-6 py-3 flex items-center shadow-lg">
                      <div className="text-lg text-gray-400 mr-3">Current Bid:</div>
                      <div className="text-3xl font-bold text-green-400">  ₹{formatPrice(currentBid || 20)}
</div>
                    </div>
                  )}
                </div>
                
                {/* Start Bidding Button */}
                {!currentBid && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={startBidding}
                    className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 text-xl font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 mb-4"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                    START BIDDING AT ₹{formatPrice(currentPlayer?.basePrice) || "10Lakhs"}
                  </motion.button>
                )}
                
                {/* Bid Controls */}
                {currentBid > 0 && (
                  <div className="mb-6">
                    <div className="flex justify-center items-center mb-6">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={incrementBid}
                        className="flex flex-col items-center justify-center bg-blue-600 rounded-xl p-4 w-56 h-24 shadow-lg"
                      >
                        <span className="text-3xl font-bold">
                          +{getBidIncrement() < 1 ? getBidIncrement() * 100 + "L" : getBidIncrement() + "Cr"}
                        </span>
                        <span className="text-sm mt-1">
                          {currentBid < 1 ? "10 Lakhs" : 
                           currentBid < 2 ? "25 Lakhs" : 
                           "50 Lakhs"} increment
                        </span>
                      </motion.button>
                    </div>
                  </div>
                )}
                
                {/* SOLD/UNSOLD Buttons */}
                {currentBid > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSold}
                      className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xl font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-3"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        SOLD
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleUnsold}
                        className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xl font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-3"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        UNSOLD
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Footer */}
          <div className="mt-8 text-center text-gray-400 text-sm">
            <p>IPL Auction Dashboard © {new Date().getFullYear()} - All rights reserved</p>
          </div>
        </div>
      </div>
    );
  }