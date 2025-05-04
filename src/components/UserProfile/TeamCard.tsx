


type Team = {
  id: string;
  number: number;
  name: string;
  amount: string;
};

export default function UserMetaCard({ data ,  handleDelete }: { data: Team  , handleDelete: (id: string) => void }) {
  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            <div className="order-3 xl:order-2">
              <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                {`Team Number : ${data?.number}`}
              </h4>
              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left mb-4">
                <p className="text-sm text-black dark:text-gray-400 font-bold ">
                  Wallet :
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ₹{` ${data.amount}`}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Team Name
                </p>
                <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {data.name}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={()=> handleDelete(data.id)}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            <svg
              className="fill-current"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M9 3C9 2.44772 9.44772 2 10 2H14C14.5523 2 15 2.44772 15 3V4H19C19.5523 4 20 4.44772 20 5C20 5.55228 19.5523 6 19 6H5C4.44772 6 4 5.55228 4 5C4 4.44772 4.44772 4 5 4H9V3ZM6 8C6 7.44772 6.44772 7 7 7H17C17.5523 7 18 7.44772 18 8V19C18 20.6569 16.6569 22 15 22H9C7.34315 22 6 20.6569 6 19V8ZM9 9C8.44772 9 8 9.44772 8 10V18C8 18.5523 8.44772 19 9 19C9.55228 19 10 18.5523 10 18V10C10 9.44772 9.55228 9 9 9ZM14 10C14 9.44772 14.4477 9 15 9C15.5523 9 16 9.44772 16 10V18C16 18.5523 15.5523 19 15 19C14.4477 19 14 18.5523 14 18V10Z"
                fill=""
              />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
