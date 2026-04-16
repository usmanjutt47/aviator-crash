import React, { useEffect } from "react";
import { Oval } from "react-loader-spinner";
import "./bets.scss";
import Context from "../../context";
import { displayName } from "../utils";

const BOT_NAMES = [
  "Arjun",
  "Neha",
  "Rahul",
  "Pooja",
  "Aman",
  "Sneha",
  "Rohan",
  "Anjali",
  "Vikram",
  "Priya",
  "Karan",
  "Meera",
  "Dev",
  "Kriti",
  "Kabir",
  "Isha",
  "Nitin",
  "Riya",
  "Yash",
  "Tina",
];

const TopHistory = () => {
  const { userInfo } = React.useContext(Context);
  const [type, setType] = React.useState(0);
  const [history, setHistory] = React.useState<
    Array<{
      _id: number;
      userinfo: { avatar: string; userName: string }[];
      betAmount: number;
      cashoutAt: number;
    }>
  >([]);
  const [loadingEffect, setLoadingEffect] = React.useState(false);
  const [headerType, setHeaderType] = React.useState("day");

  const header = [
    { type: 0, value: "day", label: "Day" },
    { type: 1, value: "month", label: "Month" },
    { type: 2, value: "year", label: "Year" },
  ];

  const callDate = async (date: string) => {
    setLoadingEffect(true);
    const newHistory = Array.from({ length: 20 }, (_, idx) => {
      const betAmount = Number((Math.random() * 400 + 20).toFixed(2));
      const cashoutAt = Number((Math.random() * 8 + 1.1).toFixed(2));
      return {
        _id: Date.now() + idx,
        userinfo: [
          {
            avatar: `/avatars/av-${Math.floor(Math.random() * 72) + 1}.png`,
            userName: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
          },
        ],
        betAmount,
        cashoutAt,
      };
    });
    setHistory(newHistory);
    setTimeout(() => {
      setLoadingEffect(false);
    }, 500);
  };
  useEffect(() => {
    // Request of Day data
    callDate("day");
  }, []);
  return (
    <>
      <div className="navigation-switcher-wrapper">
        <div className="navigation-switcher">
          <div
            className="slider"
            style={{ transform: `translate(${100 * type}px)` }}
          ></div>
          {header.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                if (headerType !== item.value) {
                  setType(item.type);
                  callDate(item.value);
                  setHeaderType(item.value);
                }
              }}
              className={`tab ${
                headerType === item.value ? "active" : "inactive"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="top-list-wrapper">
        <div className="top-items-list scroll-y h-100">
          {loadingEffect ? (
            <div className="flex items-center justify-center">
              <Oval
                height={35}
                width={35}
                color="red"
                wrapperStyle={{ marginTop: "60px" }}
                wrapperClass=""
                visible={true}
                ariaLabel="oval-loading"
                secondaryColor="#990000"
                strokeWidth={3}
                strokeWidthSecondary={4}
              />
            </div>
          ) : (
            <>
              {history.map((item: any, index: number) => (
                <div key={index} className="bet-item">
                  <div className="main">
                    <div className="icon">
                      {item.userinfo[0]?.avatar ? (
                        <img
                          className="avatar"
                          alt={item.userinfo[0]?.avatar}
                          src={item.userinfo[0]?.avatar}
                        ></img>
                      ) : (
                        <img
                          className="avatar"
                          alt="avatar"
                          src="/avatars/av-5.png"
                        ></img>
                      )}
                      <div className="username">
                        {displayName(item.userinfo[0]?.userName)}
                      </div>
                    </div>
                    <div className="score">
                      <div className="flex">
                        <div className="">
                          <span>
                            Bet,{" "}
                            {`${
                              userInfo?.currency ? userInfo?.currency : "PKR"
                            }`}
                            :&nbsp;
                          </span>
                          <span></span>
                        </div>
                        <span className="amount">
                          {item.betAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex">
                        <div className="">
                          <span>Cashed out:&nbsp;</span>
                        </div>
                        <span
                          className={`amount cashout ${
                            Number(item.cashoutAt) < 2
                              ? "blue"
                              : Number(item.cashoutAt) < 10
                                ? "purple"
                                : "big"
                          }`}
                        >
                          {Number(item.cashoutAt).toFixed(2)}x
                        </span>
                        {/* <span className="amount cashout">
                          {item.cashoutAt.toFixed(2)}x
                        </span> */}
                      </div>
                      <div className="flex">
                        <div className="">
                          <span>
                            Win,{" "}
                            {`${
                              userInfo?.currency ? userInfo?.currency : "PKR"
                            }`}
                            : &nbsp;
                          </span>
                        </div>
                        <span className="amount">
                          {(item.cashoutAt * item.betAmount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default TopHistory;
