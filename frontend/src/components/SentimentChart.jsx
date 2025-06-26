import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function SentimentChart({ data }) {
  const chartData = {
    labels: data.map(item => new Date(item.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Sentiment Score',
        data: data.map(item => item.score),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
        pointRadius: 4
      }
    ]
  };

  const options = {
    responsive: true,
    scales: {
      y: {
        min: 0,
        max: 1,
        ticks: {
          callback: value => {
            if (value === 0.2) return 'Bearish';
            if (value === 0.5) return 'Neutral';
            if (value === 0.8) return 'Bullish';
            return '';
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#f3f4f6'
        }
      },
      tooltip: {
        callbacks: {
          label: ctx => `Score: ${ctx.raw.toFixed(3)}`,
          title: items => new Date(data[items[0].dataIndex].timestamp).toLocaleString()
        }
      },
      annotation: {
        annotations: {
          bullish: {
            type: 'line',
            yMin: 0.7,
            yMax: 0.7,
            borderColor: 'rgba(34, 197, 94, 0.5)',
            borderWidth: 2,
            borderDash: [6, 6]
          },
          bearish: {
            type: 'line',
            yMin: 0.3,
            yMax: 0.3,
            borderColor: 'rgba(239, 68, 68, 0.5)',
            borderWidth: 2,
            borderDash: [6, 6]
          }
        }
      }
    }
  };

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg">
      <Line data={chartData} options={options} />
    </div>
  );
}