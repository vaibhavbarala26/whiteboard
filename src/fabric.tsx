import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { FaPen } from 'react-icons/fa';
import { CiEraser } from 'react-icons/ci';
import { MdDelete, MdUndo, MdRedo, MdDownload } from "react-icons/md";
import "./App.css";
import { useSocket } from './Hooks/UseSocket';
import Invitebyemail from './component/Invitebyemail';
import { FaRegWindowClose } from "react-icons/fa";
import Chat from './component/Chat';
import useKeycloakAuth from './Hooks/UseKeycloakAuth';
import ConnectedUsers from './component/ConnectedUsers';
import RecordRTC from 'recordrtc'; // Import RecordRTC for recording the canvas

// Define color and width options
type Color = string;
const colors: Color[] = ['red', 'blue', 'green', 'black', 'orange', 'yellow'];
const widths: number[] = [1, 5, 10, 15, 20];

// Define the shape of a line object
interface LineData {
    tool: string;  // Tool used (pen or eraser)
    width: number; // Width of the line
    points: number[]; // Array of points for the line
    color: string; // Color of the line
}

// Define the shape of a cursor object
interface Cursor {
    x: number, // X coordinate
    y: number, // Y coordinate
    id: string, // Unique identifier for the cursor
    color: string; // Color of the cursor
}

const Canvas = () => {
    const { keycloak, isAuthenticated, handleLogin, handleLogout } = useKeycloakAuth();

    // State management
    const [tool, setTool] = useState<string>('pen'); // Current tool (pen or eraser)
    const [width, setWidth] = useState<number>(5); // Current line width
    const [lines, setLines] = useState<LineData[]>([]); // Lines drawn on the canvas
    const [undoStack, setUndoStack] = useState<LineData[][]>([]); // Stack for undo functionality
    const [redoStack, setRedoStack] = useState<LineData[][]>([]); // Stack for redo functionality
    const isDrawing = useRef<boolean>(false); // Flag to track if drawing is in progress
    const [opentool, setOpentool] = useState<boolean>(false); // State to toggle tool panel
    const [color, setColor] = useState<string>('black'); // Current color for drawing
    const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
        width: window.innerWidth,
        height: window.innerHeight,
    }); // Canvas dimensions
    const [cursorData, setCursorData] = useState<{ [key: string]: Cursor }>({}); // Cursor positions
    const stageref = useRef<any>(null); // Reference to the stage (canvas)
    const [isRecording, setIsRecording] = useState<boolean>(false); // Flag to track recording state
    const recorderRef = useRef<any>(null); // Reference for the recorder

    // Function to start recording the canvas
    const startRecording = () => {
        const canvasElements = stageref.current.getContainer().getElementsByTagName('canvas');
        
        // Check if canvas elements exist
        if (canvasElements.length === 0) {
            console.error("No canvas elements found.");
            return;
        }
        
        const canvasElement = canvasElements[0];

        // Validate canvas element
        if (!canvasElement) {
            console.error("Canvas element not found!");
            return;
        }

        // Capture the stream from the canvas
        const canvasStream = canvasElement.captureStream(30); // Capture at 30 FPS
        if (!canvasStream) {
            console.error("Failed to capture stream from the canvas.");
            return;
        }

        // Initialize recorder
        const recorder = new RecordRTC(canvasStream, {
            type: 'video',
            mimeType: 'video/webm',
        });

        // Start recording after a slight delay to ensure content is rendered
        setTimeout(() => {
            recorder.startRecording();
            recorderRef.current = recorder; // Store recorder reference
            setIsRecording(true);
        }, 100); // Adjust the delay as needed
    };

    // Function to stop recording and download the video
    const stopRecording = () => {
        if (recorderRef.current) {
            recorderRef.current.stopRecording(() => {
                const blob = recorderRef.current.getBlob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); // Create a link element
                a.style.display = 'none';
                a.href = url;
                a.download = 'canvas-recording.webm'; // Set filename
                document.body.appendChild(a);
                a.click(); // Trigger download
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a); // Clean up
                setIsRecording(false); // Update recording state
            });
        } else {
            console.error("Recorder not initialized or already stopped.");
        }
    };

    const socket = useSocket(); // Hook for socket connection

    useEffect(() => {
        if (!socket) return;

        // Handle incoming drawing data
        const handleDrawing = (data: LineData) => {
            setLines((prev) => [...prev, data]);
        };

        // Handle incoming canvas data
        const handleCanvasData = (canvasData: LineData[]) => {
            setLines(canvasData);
        };

        // Handle canvas cleared event
        const handleCanvasCleared = () => {
            setLines([]);
        };

        // Handle cursor movement
        const handleCursor = (data: Cursor) => {
            setCursorData((prevCursorData) => ({
                ...prevCursorData,
                [data.id]: data,
            }));
        };

        // Set up socket event listeners
        socket.on("drawing", handleDrawing);
        socket.on("canvasData", handleCanvasData);
        socket.on("canvasCleared", handleCanvasCleared);
        socket.on("cursormove", handleCursor);

        return () => {
            // Clean up socket listeners
            socket.off("drawing", handleDrawing);
            socket.off("canvasData", handleCanvasData);
            socket.off("canvasCleared", handleCanvasCleared);
            socket.off("cursormove", handleCursor);
        };
    }, [socket]);

    // Mouse down event handler
    const handleMouseDown = (e: any) => {
        isDrawing.current = true; // Set drawing flag
        const pos = e.target.getStage().getPointerPosition(); // Get mouse position
        const newLine = { tool, points: [pos.x, pos.y], width, color }; // Create a new line

        // Update undo and redo stacks
        setUndoStack((prevStack) => [...prevStack, [...lines]]);
        setRedoStack([]);
        setLines((prevLines) => [...prevLines, newLine]); // Add new line to state
    };

    // Mouse move event handler
    const handleMouseMove = (e: any) => {
        if (!isDrawing.current) return; // Do nothing if not drawing

        const stage = e.target.getStage();
        const point = stage.getPointerPosition(); // Get current mouse position
        const lastLine = lines[lines.length - 1]; // Get the last line

        if (lastLine) {
            // Update points of the last line
            const newPoints = lastLine.points.concat([point.x, point.y]);
            const updatedLines = [...lines.slice(0, -1), { ...lastLine, points: newPoints }];
            setLines(updatedLines); // Update lines state

            // Emit drawing and cursor movement events to the socket
            if (socket) {
                socket.emit("drawing", { tool, points: newPoints, width, color });
                socket.emit("cursormove", { x: point.x, y: point.y, id: socket.id, color });
            }
        }
    };

    // Mouse up event handler
    const handleMouseUp = () => {
        isDrawing.current = false; // Reset drawing flag
    };

    // Touch event handlers
    const handleTouchStart = (e: any) => {
        e.evt.preventDefault();
        handleMouseDown(e); // Call mouse down handler
    };

    const handleTouchMove = (e: any) => {
        e.evt.preventDefault();
        handleMouseMove(e); // Call mouse move handler
    };

    const handleTouchEnd = () => {
        handleMouseUp(); // Call mouse up handler
    };

    // Function to clear the canvas
    const clearCanvas = () => {
        setLines([]); // Reset lines state
        setUndoStack((prevStack) => [...prevStack, [...lines]]);
        setRedoStack([]);
        if (socket) {
            socket.emit('clearCanvas'); // Emit clear event to socket
        }
    };

    // Function to undo last action
    const undo = () => {
        if (undoStack.length > 0) {
            const lastState = undoStack.pop();
            setRedoStack((prevRedo) => [...prevRedo, lines]); // Push current state to redo stack
            setLines(lastState || []); // Restore last state
            setUndoStack([...undoStack]); // Update undo stack
        }
    };

    // Function to redo last undone action
    const redo = () => {
        if (redoStack.length > 0) {
            const nextState = redoStack.pop();
            setUndoStack((prevUndo) => [...prevUndo, lines]); // Push current state to undo stack
            setLines(nextState || []); // Restore next state
            setRedoStack([...redoStack]); // Update redo stack
        }
    };

    // Handle window resize to adjust canvas dimensions
    useEffect(() => {
        const handleResize = () => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        };

        window.addEventListener('resize', handleResize); // Add event listener
        return () => {
            window.removeEventListener('resize', handleResize); // Clean up event listener
        };
    }, []);

    // Function to download the canvas as an image
    const handleDownload = () => {
        const uri = stageref.current.toDataURL(); // Get data URL of the canvas
        const link = document.createElement('a'); // Create a link element
        link.href = uri;
        link.download = 'canvas-image.png'; // Set filename
        document.body.appendChild(link);
        link.click(); // Trigger download
        document.body.removeChild(link); // Clean up
    };

    return (
        <div className="container-fluid p-0">
            <div className="row flex">
                <div className="col-12 position-relative py-2 px-4 flex flex-column md:flex-row">
                    <div className="flex flex-row align-items-center justify-between mb-2 gap-2">
                        {/* Open Tool Button */}
                        <div className='flex flex-row gap-2'>
                            {!opentool ? (
                                <div className='cursor-pointer shadow-lg h-20 w-20 rounded-full flex justify-center items-center font-bold text-sm' onClick={() => setOpentool(true)}>
                                    Open Tool
                                </div>
                            ) : null}
                            {/* Invite by Email Component */}
                            <div>
                                <Invitebyemail isAuthenticated={isAuthenticated} handleLogin={handleLogin} handleLogout={handleLogout} keycloak={keycloak} />
                            </div>
                            <div>
                                <Chat keycloak={keycloak} />
                            </div>
                        </div>
                        <div className='max-w-full flex justify-end items-center gap-2'>
                            {/* Start/Stop Recording Button */}
                            {!isRecording ? (
                                <div>
                                    <button onClick={startRecording} className="btn btn-primary">Start Recording</button>
                                </div> 
                            ) : (
                                <div>
                                    <button onClick={stopRecording} className="btn btn-danger">Stop Recording</button>
                                </div>
                            )}
                            <ConnectedUsers keycloak={keycloak}></ConnectedUsers>
                        </div>
                    </div>

                    {/* Tool Options Panel */}
                    {opentool && (
                        <div className="position-absolute top-2 start-50 translate-middle-x m-3 z-50 d-flex flex-column flex-md-row align-items-center bg-white shadow-lg rounded p-3">
                            {/* Color Swatches */}
                            <div className="d-flex flex-md-row flex-row gap-2">
                                {colors.map((swatchColor) => (
                                    <div
                                        key={swatchColor}
                                        className={`w-8 h-8 cursor-pointer rounded-circle border border-light`}
                                        style={{ backgroundColor: swatchColor }}
                                        onClick={() => setColor(swatchColor)}
                                    >
                                        {color === swatchColor && (
                                            <div className="w-full h-full border border-white rounded-circle" />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Tool Selection */}
                            <div className="d-flex flex-row gap-3 mt-2 mt-md-0">
                                <FaPen
                                    className={`text-4xl p-2 rounded-lg cursor-pointer ${tool === 'pen' ? 'border border-secondary' : ''}`}
                                    onClick={() => setTool('pen')}
                                />
                                <CiEraser
                                    className={`text-4xl p-2 rounded-lg cursor-pointer ${tool === 'eraser' ? 'border border-secondary' : ''}`}
                                    onClick={() => setTool('eraser')}
                                />
                            </div>

                            {/* Width Selection */}
                            <div className="d-flex flex-row gap-1 mt-2 mt-md-0">
                                {widths.map((w) => (
                                    <button
                                        key={w}
                                        className={`p-1 border rounded ${width === w ? 'bg-gray-300' : ''}`}
                                        onClick={() => setWidth(w)}
                                    >
                                        {w}px
                                    </button>
                                ))}
                            </div>

                            {/* Action Buttons */}
                            <div className="d-flex flex-row align-items-center mt-3 mt-md-0">
                                <button className="p-1 ml-3 text-2xl border rounded" onClick={clearCanvas}>
                                    <MdDelete />
                                </button>
                                <button className="p-1 ml-3 text-2xl border rounded" onClick={undo}>
                                    <MdUndo />
                                </button>
                                <button className="p-1 ml-3 text-2xl border rounded" onClick={redo}>
                                    <MdRedo />
                                </button>
                                <button className="p-1 ml-3 text-2xl border rounded" onClick={handleDownload}>
                                    <MdDownload />
                                </button>
                                <button className="p-1 ml-3 text-2xl border rounded" onClick={() => setOpentool(false)}>
                                    <FaRegWindowClose />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Canvas Area */}
                    <div className="canvas-container h-full max-w-full">
                        <Stage
                            width={dimensions.width}
                            height={dimensions.height}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            ref={stageref}
                        >
                            <Layer>
                                {lines.map((line, i) => (
                                    <Line
                                        key={i}
                                        points={line.points}
                                        stroke={line.color}
                                        strokeWidth={line.width}
                                        tension={0.5}
                                        lineCap="round"
                                        lineJoin="round"
                                        globalCompositeOperation={line.tool === 'eraser' ? 'destination-out' : 'source-over'}
                                    />
                                ))}
                            </Layer>
                            {/* Render cursors for connected users */}
                            <Layer>
                                {Object.keys(cursorData).map((id) => {
                                    const cursor: Cursor = cursorData[id];
                                    return (
                                        <Line
                                            key={cursor.id}
                                            points={[cursor.x, cursor.y, cursor.x + 5, cursor.y]}
                                            stroke={cursor.color || 'black'}
                                            strokeWidth={10}
                                            lineCap="round"
                                        />
                                    );
                                })}
                            </Layer>
                        </Stage>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Canvas;
