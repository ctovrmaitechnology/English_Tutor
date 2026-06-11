import './GameLoading.css';

export default function GameLoading({ message = 'Preparing your game...' }) {
  return (
    <div className="game-loading">
      <div className="game-loading-spinner" />
      <p>{message}</p>
    </div>
  );
}