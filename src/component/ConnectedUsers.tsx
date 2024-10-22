import { useEffect, useState } from "react";
import { useSocket } from "../Hooks/UseSocket";

interface Userdata {
    name: string;
    email: string;
    id: string;
}

const ConnectedUsers = ({ keycloak }) => {
    const [onlineUsers, setOnlineUsers] = useState<Userdata[]>([]);
    const [openDiv, setOpendiv] = useState<boolean>(false);
    const socket = useSocket();

    useEffect(() => {
        if (!socket || !keycloak?.tokenParsed) return;

        // Emit the current user data to the server
        const userData = {
            name: keycloak.tokenParsed.preferred_username,
            email: keycloak.tokenParsed.email,
            id: socket.id,
        };

        socket.emit("checkuser", userData);

        // Listen for updates to the active users list
        socket.on("activeusers", (data: Userdata[]) => {
            console.log("Active users:", data);
            setOnlineUsers(data); // Set the entire list of users
        });

        // Cleanup the listener on component unmount
        return () => {
            socket.off("activeusers");
        };
    }, [socket, keycloak]);

    return (
        
            <div className=" flex justify-center items-center">
                {/* User List Popup */}
                {openDiv && (
                    <div className="position-relative">
                    <div className=" position-absolute top-5 end-10 z-50 border-2 h-[26rem] w-[20rem] p-2 bg-black rounded-lg shadow-lg overflow-hidden transition-all duration-300 ease-in-out relative">
                        {/* Header */}
                        <div className="h-[10%] flex justify-between items-center border-b-2 border-gray-800 bg-black text-white p-2">
                            <h1 className="font-bold">Online Users</h1>
                            {/* Close Button */}
                            <button
                                className="text-white bg-red-600 px-3 py-1 rounded-full hover:bg-red-700 transition"
                                onClick={() => setOpendiv(false)}
                            >
                                X
                            </button>
                        </div>

                        {/* User List */}
                        <div className="p-3 overflow-y-auto h-[90%] space-y-3">
                            {onlineUsers.map((user, index) => (
                                <div
                                    key={index}
                                    className="p-3 rounded-lg cursor-pointer hover:bg-gray-300 bg-white text-black transition-colors flex items-center space-x-3"
                                >
                                    {/* User Avatar */}
                                    <div className="bg-gray-800 w-10 h-10 flex items-center justify-center rounded-full text-lg font-bold text-white">
                                        {user.name[0].toUpperCase()}
                                    </div>
                                    {/* User Info */}
                                    <div className="flex flex-col">
                                        <span className="text-md font-semibold">Name: {user.name}</span>
                                        <span className="text-sm text-gray-400">Email: {user.email}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    </div>
                )}

                {/* Toggle Button */}
                {!openDiv && (
                    <div
                        className="shadow-lg h-20 w-20 bg-black text-white rounded-full flex justify-center items-center font-bold cursor-pointer transition-all duration-300 ease-in-out"
                        onClick={() => setOpendiv(true)}
                    >
                        Users
                    </div>
                )}
            </div>
        
    );
};

export default ConnectedUsers;
