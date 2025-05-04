import { useState, useRef } from 'react';
import { db } from "../../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";
import * as XLSX from 'xlsx';

interface PlayerData {
  // Basic Info
  name: string;
  role: string;
  isOverseas: boolean;
  imageUrl: string;
  status: string;
  soldTo: string;
  basePrice: number;
  credits: number;
  soldPrice: number;
  year: number;
  
  // Batting Stats
  battingMatches: number;
  battingNotOuts: number;
  battingRuns: number;
  battingHighScore: number;
  battingAverage: number;
  ballsFaced: number;
  battingStrikeRate: number;
  battingCenturies: number;
  battingHalfCenturies: number;
  fours: number;
  sixes: number;
  catches: number;
  stumpings: number;
  
  // Bowling Stats
  bowlingMatches: number;
  ballsBowled: number;
  runsConceded: number;
  wickets: number;
  bestBowling: string;
  bowlingAverage: number;
  economy: number;
  bowlingStrikeRate: number;
  fourWicketHauls: number;
  fiveWicketHauls: number;
  
  [key: string]: string | number | boolean; // For dynamic access
}

const defaultPlayer: PlayerData = {
  // Basic Info
  name: "",
  role: "",
  isOverseas: false,
  imageUrl: "",
  status: "UNSOLD",
  soldTo: "",
  basePrice: 0,
  credits: 0,
  soldPrice: 0,
  year: new Date().getFullYear(),
  
  // Batting Stats
  battingMatches: 0,
  battingNotOuts: 0,
  battingRuns: 0,
  battingHighScore: 0,
  battingAverage: 0,
  ballsFaced: 0,
  battingStrikeRate: 0,
  battingCenturies: 0,
  battingHalfCenturies: 0,
  fours: 0,
  sixes: 0,
  catches: 0,
  stumpings: 0,
  
  // Bowling Stats
  bowlingMatches: 0,
  ballsBowled: 0,
  runsConceded: 0,
  wickets: 0,
  bestBowling: "0/0",
  bowlingAverage: 0,
  economy: 0,
  bowlingStrikeRate: 0,
  fourWicketHauls: 0,
  fiveWicketHauls: 0
};

const UploadPlayers = () => {
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState({ text: '', type: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selectedFile = files[0];
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { header: 1 });

      if (jsonData.length > 0) {
        setSheetHeaders(jsonData[0] as string[]);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleMappingChange = (sheetHeader: string, playerField: string) => {
    setMapping(prev => ({
      ...prev,
      [sheetHeader]: playerField
    }));
  };

  const uploadToFirebase = async () => {
    if (!file) {
      setMessage({ text: 'Please select a file first', type: 'error' });
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setMessage({ text: '', type: '' });

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet);

        let successCount = 0;
        const totalPlayers = jsonData.length;

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          const playerData: PlayerData = { ...defaultPlayer };

          // Skip header row if it exists in the data
          if (i === 0 && Object.values(row).some(val => sheetHeaders.includes(String(val)))) {
            continue;
          }

          // Map sheet columns to player fields
          Object.entries(mapping).forEach(([sheetHeader, playerField]) => {
            if (row[sheetHeader] !== undefined && row[sheetHeader] !== null && row[sheetHeader] !== '') {
              // Handle type conversions
              if (typeof defaultPlayer[playerField] === 'number') {
                playerData[playerField] = isNaN(Number(row[sheetHeader])) ? 0 : Number(row[sheetHeader]);
              } else if (typeof defaultPlayer[playerField] === 'boolean') {
                playerData[playerField] = String(row[sheetHeader]).toLowerCase() === 'true';
              } else {
                playerData[playerField] = String(row[sheetHeader]);
              }
            }
          });

          // Special handling for best bowling (might be in format "4/20")
          if (playerData.bestBowling === "0" && playerData.wickets > 0) {
            playerData.bestBowling = `${playerData.wickets}/${playerData.runsConceded}`;
          }

          // Generate document ID
          const docId = `${playerData.name.toLowerCase().replace(/\s+/g, '-')}-${playerData.year}`;

          try {
            await setDoc(doc(db, "players", docId), playerData);
            successCount++;
          } catch (error) {
            console.error(`Error uploading ${playerData.name}:`, error);
          }

          setProgress(Math.floor(((i + 1) / totalPlayers) * 100));
        }

        setIsUploading(false);
        setMessage({
          text: `Upload complete! ${successCount}/${totalPlayers} players uploaded successfully`,
          type: successCount === totalPlayers ? 'success' : successCount > 0 ? 'warning' : 'error'
        });

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setFile(null);
        setMapping({});
        setSheetHeaders([]);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      setIsUploading(false);
      setMessage({ text: 'Error processing file: ' + (error as Error).message, type: 'error' });
      console.error(error);
    }
  };

  const playerFields = Object.keys(defaultPlayer);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Upload Players Data</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Excel/CSV File
          </label>
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        {sheetHeaders.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-4">Map Sheet Columns to Player Fields</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sheet Column
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player Field
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sheetHeaders.map((header) => (
                    <tr key={header}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {header}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={mapping[header] || ''}
                          onChange={(e) => handleMappingChange(header, e.target.value)}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          <option value="">-- Select Field --</option>
                          {playerFields.map((field) => (
                            <option key={field} value={field}>
                              {field}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-blue-700">Uploading...</span>
              <span className="text-sm font-medium text-blue-700">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {message.text && (
          <div
            className={`mb-4 p-4 rounded-md ${
              message.type === 'error'
                ? 'bg-red-100 text-red-700'
                : message.type === 'success'
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          onClick={uploadToFirebase}
          disabled={isUploading || Object.keys(mapping).length === 0}
          className={`px-4 py-2 rounded-md text-white ${
            isUploading || Object.keys(mapping).length === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isUploading ? 'Uploading...' : 'Upload to Firebase'}
        </button>
      </div>
    </div>
  );
};

export default UploadPlayers;