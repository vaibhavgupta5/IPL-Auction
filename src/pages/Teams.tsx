import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, addDoc, getDocs, doc, deleteDoc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "../firebase/firebase";
import PageMeta from "../components/common/PageMeta";
import { useModal } from "../hooks/useModal";
import { Modal } from "../components/ui/modal";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Button from "../components/ui/button/Button";
import { PlusIcon } from '../icons';

// Types
type Team = {
  id: string;
  number: number;
  name: string;
  amount: string;
  players?: string[];
  overseas?: number;
  shortName?: string;
};

type Player = {
  id: string;
  name: string;
  basePrice: number;
  soldPrice: number;
  imageUrl: string;
  role: string;
  isOverseas: boolean;
  credits: number;
  battingMatches?: number;
  battingRuns?: number;
  wickets?: number;
  
};

// Team colors
const teamColors = [
  { primary: "#004BA0", secondary: "#D1AB3E" }, // MI
  { primary: "#FFFF3C", secondary: "#F25C19" }, // CSK
  { primary: "#D5000B", secondary: "#000000" }, // RCB
  { primary: "#3A225D", secondary: "#B3A123" }, // KKR
  { primary: "#0078BC", secondary: "#EF1B23" }, // DC
  { primary: "#E01E26", secondary: "#A7A9AC" }, // PBKS
  { primary: "#FF7A15", secondary: "#000000" }, // SRH
  { primary: "#EA1A85", secondary: "#254AA5" }, // RR
  { primary: "#1C1C1C", secondary: "#0B4973" }, // GT
  { primary: "#A72056", secondary: "#FFCC00" }  // LSG
];

export default function Teams() {
  // State
  const { isOpen, openModal, closeModal } = useModal();
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, teamId: "" });
  const [team, setTeam] = useState({
    number: '',
    name: '',
    amount: '100'
  });
  const [loading, setLoading] = useState(false);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamStats, setTeamStats] = useState<Array<{
    id: string;
    name: string;
    totalPlayers: number;
    budget: number;
    totalSpent: number;
    overseasCount: number;
    totalCredits: number;
    color: { primary: string; secondary: string };
  }>>([]);



  

  // Fetch teams from Firestore
  const fetchTeams = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "teams"));
      const teamList: Team[] = querySnapshot.docs.map((doc, index) => ({
        id: doc.id,
        ...(doc.data() as Omit<Team, 'id'>),
        color: teamColors[index % teamColors.length]
      }));
      setAllTeams(teamList);
      
      // Calculate team stats for dashboard
      const stats = await Promise.all(
        teamList.map(async (team) => {
          let totalPlayers = 0;
          let totalSpent = 0;
          let overseasCount = 0;
          let totalCredits = 0;
          
          if (team.players && team.players.length > 0) {
            totalPlayers = team.players.length;
            
            for (const playerRef of team.players) {
              try {
                const playerId = typeof playerRef === 'string' 
                  ? playerRef 
                  : (playerRef as { id: string }).id;
                const playerDoc = await getDoc(doc(db, "players", playerId));
                
                if (playerDoc.exists()) {
                  const playerData = playerDoc.data();
                  if (playerData.isOverseas) overseasCount++;
                  if (playerData.soldPrice) totalSpent += playerData.soldPrice;
                  if (playerData.credits) totalCredits += playerData.credits;
                }
              } catch (err) {
                console.error("Error processing player:", err);
              }
            }
          }
          
          return {
            id: team.id,
            name: team.name,
            totalPlayers,
            budget: parseFloat(team.amount),
            totalSpent,
            overseasCount,
            totalCredits,
            color: teamColors[teamList.indexOf(team) % teamColors.length]
          };
        })
      );
      
      setTeamStats(stats);
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast.error("Failed to fetch teams");
    } finally {
      setLoading(false);
    }
  };

  // Fetch players for a specific team
  const fetchTeamPlayers = async (teamId: string) => {
    setLoadingPlayers(true);
    try {
      const teamDoc = await getDoc(doc(db, "teams", teamId));
      if (!teamDoc.exists()) {
        toast.error("Team not found");
        return;
      }

      console.log("first")
      
      const teamData = teamDoc.data() as Team;
      const { ...restTeamData } = teamData;
      setSelectedTeam({
        id: teamDoc.id,
        ...restTeamData
      });
      
      if (!teamData.players || teamData.players.length === 0) {
        setTeamPlayers([]);
        setLoadingPlayers(false);
        return;
      }
      
      const playerPromises = teamData.players.map(async (playerRef) => {
        try {
          // Extract ID from reference or use as is if it's already an ID
          const playerId = typeof playerRef === 'string' 
            ? playerRef 
            : (playerRef as { id: string }).id;
          const playerDoc = await getDoc(doc(db, "players", playerId));
          
          if (playerDoc.exists()) {
            return {
              id: playerDoc.id,
              ...playerDoc.data()
            } as Player;
          }
          return null;
        } catch (err) {
          console.error("Error fetching player:", err);
          return null;
        }
      });
      
      const playersData = (await Promise.all(playerPromises)).filter(Boolean) as Player[];
      setTeamPlayers(playersData);
    } catch (error) {
      console.error("Error fetching team players:", error);
      toast.error("Failed to fetch team players");
    } finally {
      setLoadingPlayers(false);
    }
  };

  // Add new team
  const handleSave = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, "teams"), {
        number: +team.number,
        name: team.name,
        amount: team.amount,
        players: [],
        overseas: 0,
        shortName: team.name.substring(0, 3).toUpperCase()
      });
      await fetchTeams();
      toast.success("Team added successfully");
      closeModal();
      // Reset form
      setTeam({
        number: '',
        name: '',
        amount: '100'
      });
    } catch (error) {
      toast.error("Failed to add team");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Delete team
  const handleDelete = async (teamId: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, "teams", teamId));
      setAllTeams(prev => prev.filter(team => team.id !== teamId));
      toast.success("Team deleted successfully");
    } catch (error) {
      console.error("Error deleting team:", error);
      toast.error("Failed to delete team");
    } finally {
      setLoading(false);
    }
  };

  // Open team details modal
  const openTeamDetails = (teamId: string) => {
    fetchTeamPlayers(teamId);
    setDetailsModal({ isOpen: true, teamId });
  };

  // Close team details modal
  const closeTeamDetails = () => {
    setDetailsModal({ isOpen: false, teamId: "" });
    setTeamPlayers([]);
    setSelectedTeam(null);
  };

  // Initial data fetch
  useEffect(() => {
    fetchTeams();
  }, []);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  const tabVariants = {
    inactive: { borderColor: "rgba(209, 213, 219, 0.5)", color: "#6B7280" },
    active: { borderColor: "#3B82F6", color: "#3B82F6" }
  };

  return (
    <>
      <PageMeta
        title="IPL Teams Dashboard"
        description="Manage IPL Teams and view team statistics"
      />
      
      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-500 opacity-10 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-purple-500 opacity-10 blur-3xl"></div>
      </div>

      {/* Main Container */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/90 lg:p-6">
        {/* Header with Tabs */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
          <h2 className="mb-4 text-2xl font-bold text-gray-800 dark:text-white/90 md:mb-0">
            IPL Teams Management
          </h2>
          
          <div className="flex items-center">
            <div className="mr-4 flex rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <motion.button
                variants={tabVariants}
                animate={activeTab === "dashboard" ? "active" : "inactive"}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg border-b-2 ${
                  activeTab === "dashboard" 
                    ? "border-blue-500 text-blue-500" 
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
                onClick={() => setActiveTab("dashboard")}
              >
                Dashboard
              </motion.button>
              <motion.button
                variants={tabVariants}
                animate={activeTab === "teams" ? "active" : "inactive"}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg border-b-2 ${
                  activeTab === "teams" 
                    ? "border-blue-500 text-blue-500" 
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
                onClick={() => setActiveTab("teams")}
              >
                Teams
              </motion.button>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-blue-700"
              onClick={openModal}
            >
              <PlusIcon /> Add Team
            </motion.button>
          </div>
        </div>

        {/* Dashboard View */}
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                </div>
              ) : (
                <>
                  {/* Summary Stats */}
                  <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <motion.div
                      variants={itemVariants}
                      className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg"
                    >
                      <h3 className="mb-2 text-lg font-medium opacity-90">Total Teams</h3>
                      <p className="text-3xl font-bold">{allTeams.length}</p>
                    </motion.div>
                    
                    <motion.div
                      variants={itemVariants}
                      className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-lg"
                    >
                      <h3 className="mb-2 text-lg font-medium opacity-90">Total Budget</h3>
                      <p className="text-3xl font-bold">₹{(allTeams.length * 1000).toFixed(0)} Cr</p>
                    </motion.div>
                    
                    <motion.div
                      variants={itemVariants}
                      className="rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg"
                    >
                      <h3 className="mb-2 text-lg font-medium opacity-90">Players Acquired</h3>
                      <p className="text-3xl font-bold">
                        {teamStats.reduce((total, team) => total + team.totalPlayers, 0)}
                      </p>
                    </motion.div>
                    
                    <motion.div
                      variants={itemVariants}
                      className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white shadow-lg"
                    >
                      <h3 className="mb-2 text-lg font-medium opacity-90">Overseas Players</h3>
                      <p className="text-3xl font-bold">
                        {teamStats.reduce((total, team) => total + team.overseasCount, 0)}
                      </p>
                    </motion.div>
                  </div>
                  
                  {/* Team Stats */}
                  <div className="mb-6">
                    <h3 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
                      Team Status
                    </h3>
                    
                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
  <tr>
    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
      Team
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
      Players
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
      Overseas
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
      Spent (Cr)
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
      Remaining (Cr)
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
      Credits
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
      Action
    </th>
  </tr>
</thead>
                          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                            {teamStats.map((team, index) => (
                              <motion.tr
                                key={team.id}
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                transition={{ delay: index * 0.05 }}
                                className="hover:bg-gray-50 dark:hover:bg-gray-800"
                              >
                                <td className="whitespace-nowrap px-6 py-4">
                                  <div className="flex items-center">
                                    <div
                                      className="mr-3 h-8 w-8 rounded-full"
                                      style={{ 
                                        backgroundColor: teamColors[index % teamColors.length].primary,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: teamColors[index % teamColors.length].primary === "#FFFF3C" ? "#000" : "#FFF",
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      {team.name.substring(0, 2)}
                                    </div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {team.name}
                                    </div>
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-gray-700 dark:text-gray-300">
                                  {team.totalPlayers}/25
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-gray-700 dark:text-gray-300">
                                  {team.overseasCount}/4
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-gray-700 dark:text-gray-300">
                                  ₹{team.totalSpent.toFixed(2)}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-gray-700 dark:text-gray-300">
                                  ₹{(team.budget - team.totalSpent).toFixed(2)}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-gray-700 dark:text-gray-300">
  {team.totalCredits || 0}
</td>
                                <td className="whitespace-nowrap px-6 py-4">
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                                    onClick={() => openTeamDetails(team.id)}
                                  >
                                    View
                                  </motion.button>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  
                 
                </>
              )}
            </motion.div>
          )}

          {/* Teams List View */}
          {activeTab === "teams" && (
            <motion.div
              key="teams"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
                >
                  {allTeams.map((item, index) => (
                    <motion.div
                      key={item.id}
                      variants={itemVariants}
                      transition={{ delay: index * 0.05 }}
                      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div
                              className="mr-4 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                              style={{ 
                                backgroundColor: teamColors[index % teamColors.length].primary,
                                color: teamColors[index % teamColors.length].primary === "#FFFF3C" ? "#000" : "#FFF" 
                              }}
                            >
                              {item.name.substring(0, 2)}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                {item.name}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Team #{item.number}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                          <div className="flex justify-between">
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Budget</p>
                              <p className="text-lg font-medium text-gray-800 dark:text-white">
                                ₹{(parseInt(item.amount)).toFixed(0)} Cr
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Players</p>
                              <p className="text-lg font-medium text-gray-800 dark:text-white">
                                {item.players?.length || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Overseas</p>
                              <p className="text-lg font-medium text-gray-800 dark:text-white">
                                {item.overseas || 0}/4
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 flex justify-between">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                            onClick={() => openTeamDetails(item.id)}
                          >
                            View Players
                          </motion.button>
                          
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                            onClick={() => handleDelete(item.id)}
                          >
                            Delete
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Team Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <h3 className="mb-6 text-xl font-bold text-gray-800 dark:text-white/90">
            Add New Team
          </h3>
          
          <div className="custom-scrollbar max-h-[450px] overflow-y-auto px-2 pb-3">
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
              <div className="col-span-2 lg:col-span-1">
                <Label>Team Number</Label>
                <Input
                  type="number"
                  value={team.number}
                  onChange={(e) => setTeam({ ...team, number: e.target.value })}
                />
              </div>
              <div className="col-span-2 lg:col-span-1">
                <Label>Team Name</Label>
                <Input
                  type="text"
                  value={team.name}
                  onChange={(e) => setTeam({ ...team, name: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Allotted Amount</Label>
                <Input type="text" value="100 Cr" disabled />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Default budget for all teams is ₹1000 Crores
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex items-center gap-3 lg:justify-end">
            <Button size="sm" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave} 
              disabled={loading || !team.name || !team.number}
            >
              {loading ? "Saving..." : "Add Team"}
            </Button>
          </div>
        </div>
      </Modal>

{/* Team Details Modal */}
<AnimatePresence>
        {detailsModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#00000078] bg-opacity-75 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
            >
              {/* Modal Header with team info */}
              <div 
                className="relative h-40 overflow-hidden bg-cover bg-center"
                style={{ 
                  backgroundColor: selectedTeam ? teamColors[allTeams.findIndex(t => t.id === selectedTeam.id) % teamColors.length].primary : '#3B82F6',
                }}
              >
                {/* Stadium background effect */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <div className="h-96 w-96 rounded-full border-4 border-white"></div>
                  <div className="absolute h-48 w-48 rounded-full border-4 border-white"></div>
                </div>
                
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                
                {/* Close button */}
                <button
                  onClick={closeTeamDetails}
                  className="absolute right-4 top-4 rounded-full bg-black bg-opacity-30 p-2 text-white transition hover:bg-opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                {/* Team info */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="flex items-end justify-between">
                    <div className="flex items-center">
                      <div className="mr-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white text-2xl font-bold">
                        {selectedTeam?.name.substring(0, 2)}
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold">{selectedTeam?.name}</h2>
                        <p className="opacity-90">Team #{selectedTeam?.number}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg">Budget Remaining</p>
                      <p className="text-2xl font-bold">
                        ₹{selectedTeam ? (parseInt(selectedTeam.amount)).toFixed(2) : 0} Cr
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Team Players Content */}
              <div className="p-6">
                <div className="mb-6 flex flex-wrap justify-between gap-4">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    Team Players
                  </h3>
                  
                  <div className="flex gap-3">
                    <div className="rounded-lg bg-blue-100 px-3 py-1 dark:bg-blue-900/30">
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Players: {teamPlayers.length}/25
                      </span>
                    </div>
                    <div className="rounded-lg bg-purple-100 px-3 py-1 dark:bg-purple-900/30">
                      <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
                        Overseas: {teamPlayers.filter(p => p.isOverseas).length}/4
                      </span>
                    </div>
                  </div>
                </div>
                
                {loadingPlayers ? (
                  <div className="flex h-64 items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : teamPlayers.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                    <div className="text-gray-500 dark:text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="mt-4 text-lg font-medium">No Players</p>
                      <p className="mt-1">This team hasn't acquired any players yet.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Player stats summary */}
                    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      <div className="rounded-xl bg-gradient-to-br from-blue-500/90 to-blue-600/90 p-4 text-white shadow">
                        <h4 className="text-sm font-medium opacity-90">Total Spent</h4>
                        <p className="mt-1 text-2xl font-bold">
                          ₹{teamPlayers.reduce((sum, player) => sum + (player.soldPrice || 0), 0).toFixed(2)} Cr
                        </p>
                      </div>
                      
                      <div className="rounded-xl bg-gradient-to-br from-purple-500/90 to-purple-600/90 p-4 text-white shadow">
                        <h4 className="text-sm font-medium opacity-90">Batsmen</h4>
                        <p className="mt-1 text-2xl font-bold">
                          {teamPlayers.filter(p => p.role === "Batter" || p.role === "Wicketkeeper").length}
                        </p>
                      </div>
                      
                      <div className="rounded-xl bg-gradient-to-br from-red-500/90 to-red-600/90 p-4 text-white shadow">
                        <h4 className="text-sm font-medium opacity-90">Bowlers</h4>
                        <p className="mt-1 text-2xl font-bold">
                          {teamPlayers.filter(p => p.role === "Bowler").length}
                        </p>
                      </div>
                      
                      <div className="rounded-xl bg-gradient-to-br from-green-500/90 to-green-600/90 p-4 text-white shadow">
                        <h4 className="text-sm font-medium opacity-90">All-Rounders</h4>
                        <p className="mt-1 text-2xl font-bold">
                          {teamPlayers.filter(p => p.role === "All-Rounder").length}
                        </p>
                      </div>
                    </div>
                  
                    {/* Players Table */}
                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Player
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Role
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Base Price
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Sold Price
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Stats
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                            {teamPlayers.map((player, index) => (
                              <motion.tr
                                key={player.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="hover:bg-gray-50 dark:hover:bg-gray-800"
                              >
                                <td className="whitespace-nowrap px-6 py-4">
                                  <div className="flex items-center">
                                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
                                      <img 
                                        src={player.imageUrl || "/player-placeholder.png"} 
                                        alt={player.name} 
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                    <div className="ml-4">
                                      <div className="font-medium text-gray-900 dark:text-white">
                                        {player.name}
                                      </div>
                                      <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {player.isOverseas ? "Overseas" : "Indian"}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                    player.role === "Batter" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" :
                                    player.role === "Bowler" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" :
                                    player.role === "All-Rounder" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" :
                                    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                                  }`}>
                                    {player.role}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-gray-700 dark:text-gray-300">
                                  ₹{player.basePrice} Cr
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-green-600 dark:text-green-400 font-medium">
                                  ₹{player.soldPrice} Cr
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-center">
                                  <div className="flex justify-center space-x-4">
                                    <div className="text-center">
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Matches
                                      </div>
                                      <div className="font-medium text-gray-900 dark:text-white">
                                        {player.battingMatches || 0}
                                      </div>
                                    </div>
                                    
                                    <div className="text-center">
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Runs
                                      </div>
                                      <div className="font-medium text-gray-900 dark:text-white">
                                        {player.battingRuns || 0}
                                      </div>
                                    </div>
                                    
                                    <div className="text-center">
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Wickets
                                      </div>
                                      <div className="font-medium text-gray-900 dark:text-white">
                                        {player.wickets || 0}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}