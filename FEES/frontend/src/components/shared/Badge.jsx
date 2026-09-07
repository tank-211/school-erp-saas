// Badge Component for Status Display
export default function Badge({ status }) {
  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
      case "Approved":
        return "bg-green-100 text-green-800 border border-green-300";
      case "Rejected":
        return "bg-red-100 text-red-800 border border-red-300";
      case "Processed":
        return "bg-blue-100 text-blue-800 border border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-300";
    }
  };

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
        status
      )}`}
    >
      {status}
    </span>
  );
}
