import React from "react";
import { ResultInfo } from "../types";

interface ResultOverlayProps {
  result: ResultInfo | null;
  onPlayAgain: () => void;
}

const fmtBtc = (v: number) => v.toFixed(8);

export const ResultOverlay: React.FC<ResultOverlayProps> = ({
  result,
  onPlayAgain,
}) => {
  if (!result) return null;
  return (
    <div
      style={{
        zIndex: 9999,
      }}
      className={`rcard ${result.type}`}
    >
      <div className="rmult">{result.mult.toFixed(2)}x</div>
      <div className="rdiv"></div>
      <div className="ramt-row">
        <div className="rcoin">$</div>
        <div className="ramt">{fmtBtc(result.amount)}</div>
      </div>
      <button className="ragain" onClick={onPlayAgain}>
        Play Again
      </button>
    </div>
  );
};

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;
  return (
    <div id="toast" className="show">
      {message}
    </div>
  );
};
