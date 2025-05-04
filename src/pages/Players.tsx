/* eslint-disable @typescript-eslint/no-explicit-any */
import PageMeta from "../components/common/PageMeta";
import { useModal } from "../hooks/useModal";
import { Modal } from "../components/ui/modal";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Button from "../components/ui/button/Button";
import { PlusIcon } from "../icons";
import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "../firebase/firebase";

type Player = {
  id: string;
  name: string;
  role: string;
  isOverseas: boolean;
  imageUrl: string;
  year: number;
  credits: number;
  basePrice: number;
  matches: number;
  runs: number;
  notOuts: number;
  highScore: number;
  battingAvg: number;
  ballsFaced: number;
  strikeRate: number;
  centuries: number;
  halfCenturies: number;
  wickets: number;
  bowlingAvg: number;
  economy: number;
  bowlingStrikeRate: number;
  runsConceded: number;
  status: string;
};

export default function Players() {
  const { isOpen, openModal, closeModal } = useModal();
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);

  const initialPlayerState: Omit<Player, "id"> = {
    name: "",
    role: "",
    isOverseas: false,
    imageUrl: "",
    year: new Date().getFullYear(),
    credits: 0,
    basePrice: 0,
    matches: 0,
    runs: 0,
    notOuts: 0,
    highScore: 0,
    battingAvg: 0,
    ballsFaced: 0,
    strikeRate: 0,
    centuries: 0,
    halfCenturies: 0,
    wickets: 0,
    bowlingAvg: 0,
    economy: 0,
    bowlingStrikeRate: 0,
    runsConceded: 0,
    status: "UNSOLD",
  };

  const [player, setPlayer] = useState<Omit<Player, "id">>(initialPlayerState);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "players"));
      const playerList: Player[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Player, "id">),
      }));
      setPlayers(playerList);
    } catch (error) {
      console.error("Error fetching players:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, "players"), player);
      await fetchPlayers();
      toast.success("Player added successfully");
      closeModal();
      setPlayer(initialPlayerState);
    } catch (error) {
      toast.error("Something went wrong");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (playerId: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, "players", playerId));
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
      toast.success("Player deleted successfully");
    } catch (error) {
      toast.error("Failed to delete player");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  return (
    <>
      <PageMeta title="Players" description="Manage Players" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="w-full flex justify-between items-center mb-10">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Players
          </h3>
          <button
            onClick={openModal}
            className="w-fit h-12 px-4 flex items-center gap-1 bg-blue-600 text-white rounded-2xl"
          >
            <PlusIcon /> Add Player
          </button>
        </div>

        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-[700px] m-4"
        >
          <div className="rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
            <div className="max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(player).map(([key, value]) => {
                  const isBoolean = typeof value === "boolean";
                  const isFullWidth = ["name", "imageUrl", "role"].includes(
                    key
                  );

                  return (
                    <div
                      key={key}
                      className={isFullWidth ? "md:col-span-2" : ""}
                    >
                      <Label className="capitalize">
                        {key.replace(/([A-Z])/g, " $1")}
                      </Label>

                      {isBoolean ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) =>
                              setPlayer((prev) => ({
                                ...prev,
                                [key]: e.target.checked,
                              }))
                            }
                          />
                          <span>{key}</span>
                        </div>
                      ) : key === "role" ? (
                        <select
                          value={value}
                          onChange={(e) =>
                            setPlayer((prev) => ({
                              ...prev,
                              role: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:text-white"
                        >
                          <option value="">Select Role</option>
                          <option value="WK-Batter">WK-Batter</option>
                          <option value="Batter">Batter</option>
                          <option value="All-Rounder">All-Rounder</option>
                          <option value="Bowler">Bowler</option>
                        </select>
                      ) : (
                        <div
                          onBlur={(e: any) => {
                            if (
                              typeof value === "number" &&
                              e.target.value === ""
                            ) {
                              setPlayer((prev) => ({ ...prev, [key]: 0 }));
                            }
                          }}
                        >
                          <Input
                            type={typeof value === "number" ? "number" : "text"}
                            value={value}
                            onChange={(e) =>
                              setPlayer((prev) => ({
                                ...prev,
                                [key]:
                                  typeof value === "number"
                                    ? +e.target.value
                                    : e.target.value,
                              }))
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={closeModal}>
                Close
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? "Saving..." : "Save Player"}
              </Button>
            </div>
          </div>
        </Modal>

        {loading ? (
          <div className="text-center text-gray-500 py-4">Loading...</div>
        ) : (
          <div className="space-y-4">
            {players.map((p) => (
              <div
                key={p.id}
                className="border p-4 rounded-lg flex justify-between items-center"
              >
                <div className="flex gap-3 items-start">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-16 h-16 object-contain border rounded"
                  />
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm text-gray-500">
                      {p.role} | Year: {p.year} | Base Price: ₹{p.basePrice}
                    </div>

                    {p.role.toLowerCase() === "batter" && (
                      <div className="text-xs text-gray-600 mt-1">
                        Runs: {p.runs} | Avg: {p.battingAvg} | SR:{" "}
                        {p.strikeRate}
                      </div>
                    )}

                    {p.role.toLowerCase() === "bowler" && (
                      <div className="text-xs text-gray-600 mt-1">
                        Wickets: {p.wickets} | Avg: {p.bowlingAvg} | Econ:{" "}
                        {p.economy}
                      </div>
                    )}

                    {p.role.toLowerCase() === "allrounder" && (
                      <div className="text-xs text-gray-600 mt-1 space-y-1">
                        <div>
                          Batting – Runs: {p.runs} | Avg: {p.battingAvg} | SR:{" "}
                          {p.strikeRate}
                        </div>
                        <div>
                          Bowling – Wickets: {p.wickets} | Avg: {p.bowlingAvg} |
                          Econ: {p.economy}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(p.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
                >
                  <svg
                    className="fill-current"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M9 3C9 2.44772 9.44772 2 10 2H14C14.5523 2 15 2.44772 15 3V4H19C19.5523 4 20 4.44772 20 5C20 5.55228 19.5523 6 19 6H5C4.44772 6 4 5.55228 4 5C4 4.44772 4.44772 4 5 4H9V3ZM6 8C6 7.44772 6.44772 7 7 7H17C17.5523 7 18 7.44772 18 8V19C18 20.6569 16.6569 22 15 22H9C7.34315 22 6 20.6569 6 19V8ZM9 9C8.44772 9 8 9.44772 8 10V18C8 18.5523 8.44772 19 9 19C9.55228 19 10 18.5523 10 18V10C10 9.44772 9.55228 9 9 9ZM14 10C14 9.44772 14.4477 9 15 9C15.5523 9 16 9.44772 16 10V18C16 18.5523 15.5523 19 15 19C14.4477 19 14 18.5523 14 18V10Z"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
