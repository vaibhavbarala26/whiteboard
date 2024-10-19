import { useState, useEffect, useMemo } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { io } from 'socket.io-client';

interface Cursor {
    x: number;
    y: number;
    id: string;
    color: string; // Optional color property
}

const Canvas = () => {
    const [cursorData, setCursorData] = useState<Record<string, Cursor>>({}); // Store cursors for all users
    const socket = useMemo(() => io("http://localhost:1042"), []);

    useEffect(() => {
        socket.on("connect", () => {
            console.log("Connected to socket with ID:", socket.id);
        });

        const handleCursor = (data: Cursor) => {
            console.log("Received cursor data:", data);
            setCursorData((prevCursorData) => ({
                ...prevCursorData,
                [data.id]: { x: data.x, y: data.y, id: data.id, color: data.color },
            }));
        };

        socket.on("cursormove", handleCursor);

        return () => {
            socket.off("cursormove", handleCursor);
        };
    }, [socket]);

    const handleMouseMove = (e: any) => {
        const stage = e.target.getStage();
        const point = stage.getPointerPosition();
        
        if (point) {
            console.log("Cursor position:", point);
            socket.emit("cursormove", { 
                x: point.x, 
                y: point.y, 
                id: socket.id, 
                color: 'red' // Default color
            });
        }
    };

    return (
        <div className='bg-red-400'>
            <h1>hello</h1>
        <Stage onMouseMove={handleMouseMove} className='bg-red-500'>
            <Layer>
                {/* Render other users' cursors */}
                {Object.keys(cursorData).map((id) => {
                    const cursor = cursorData[id];
                    return (
                        <Line
                            key={cursor.id}
                            points={[cursor.x, cursor.y, cursor.x + 5, cursor.y]}
                            stroke={cursor.color || 'black'} // Fallback to black if no color
                            strokeWidth={3}
                            lineCap="round"
                        />
                    );
                })}
            </Layer>
        </Stage></div>
    );
};

export default Canvas;
