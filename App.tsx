import React, { useState, useCallback, useRef, ChangeEvent } from 'react';
import { AppStep } from './types';
import { generateTattooFromUpload, generateTattooFromPrompt } from './services/geminiService';
import { UploadIcon, WandSparklesIcon, DownloadIcon, ArrowLeftIcon, RefreshCwIcon, CameraIcon } from './components/icons';

// Helper to get a data URL from a File object
const getFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const Navbar: React.FC = () => (
    <header className="bg-gray-900/70 backdrop-blur-sm shadow-lg w-full z-10 border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center h-16">
                <h1 className="text-2xl font-bold text-white tracking-wider">
                    Cezimbra Tattoo
                </h1>
            </div>
        </div>
    </header>
);

const App: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.SELECT_BODY_PHOTO);
    const [bodyPhotoFile, setBodyPhotoFile] = useState<File | null>(null);
    const [bodyPhotoPreview, setBodyPhotoPreview] = useState<string | null>(null);
    const [tattooDesignFile, setTattooDesignFile] = useState<File | null>(null);
    const [tattooDesignPreview, setTattooDesignPreview] = useState<string | null>(null);
    const [tattooPrompt, setTattooPrompt] = useState<string>('');
    const [finalImage, setFinalImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    const bodyFileInputRef = useRef<HTMLInputElement>(null);
    const tattooFileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (
      event: ChangeEvent<HTMLInputElement>, 
      setFile: (file: File | null) => void, 
      setPreview: (url: string | null) => void
    ) => {
        const file = event.target.files?.[0];
        if (file) {
            setFile(file);
            const previewUrl = await getFileAsDataURL(file);
            setPreview(previewUrl);
        }
    };

    const resetState = () => {
        setStep(AppStep.SELECT_BODY_PHOTO);
        setBodyPhotoFile(null);
        setBodyPhotoPreview(null);
        setTattooDesignFile(null);
        setTattooDesignPreview(null);
        setTattooPrompt('');
        setFinalImage(null);
        setIsLoading(false);
        setError(null);
    };

    const handleBack = () => {
        if (step === AppStep.CHOOSE_METHOD) {
            setStep(AppStep.SELECT_BODY_PHOTO);
        } else if (step === AppStep.UPLOAD_TATTOO_DESIGN || step === AppStep.CREATE_TATTOO_WITH_AI) {
            setStep(AppStep.CHOOSE_METHOD);
        }
    }

    const handleGeneration = useCallback(async () => {
        if (!bodyPhotoFile) {
            setError("Por favor, selecione uma foto do local do corpo.");
            return;
        }

        setError(null);
        setIsLoading(true);
        setStep(AppStep.GENERATING);

        try {
            let resultBase64: string;
            if (step === AppStep.UPLOAD_TATTOO_DESIGN) {
                if (!tattooDesignFile) {
                    throw new Error("Por favor, selecione um design de tatuagem.");
                }
                resultBase64 = await generateTattooFromUpload(bodyPhotoFile, tattooDesignFile);
            } else if (step === AppStep.CREATE_TATTOO_WITH_AI) {
                 if (!tattooPrompt.trim()) {
                    throw new Error("Por favor, descreva a tatuagem que você deseja.");
                }
                resultBase64 = await generateTattooFromPrompt(bodyPhotoFile, tattooPrompt);
            } else {
                throw new Error("Etapa de geração inválida.");
            }
            setFinalImage(`data:image/jpeg;base64,${resultBase64}`);
            setStep(AppStep.RESULT);
        } catch (e: any) {
            setError(e.message || "Ocorreu um erro desconhecido ao gerar a imagem.");
            setStep(AppStep.RESULT); // Go to result screen to show the error
        } finally {
            setIsLoading(false);
        }
    }, [bodyPhotoFile, tattooDesignFile, tattooPrompt, step]);


    const renderStep = () => {
        switch (step) {
            case AppStep.SELECT_BODY_PHOTO:
                return (
                    <div className="w-full max-w-md text-center">
                        <h1 className="text-3xl font-bold text-white mb-2">Gerador de Tatuagem IA</h1>
                        <p className="text-gray-400 mb-6">Veja como uma tatuagem ficaria em sua pele.</p>
                        {bodyPhotoPreview && (
                             <div className="mb-4">
                                <img src={bodyPhotoPreview} alt="Prévia do local" className="rounded-lg max-h-60 mx-auto" />
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={bodyFileInputRef}
                            onChange={(e) => handleFileSelect(e, setBodyPhotoFile, setBodyPhotoPreview)}
                        />
                         <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={() => bodyFileInputRef.current?.click()}
                                className="flex-1 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <UploadIcon className="h-5 w-5" />
                                Enviar Foto
                            </button>
                             <input type="file" accept="image/*" capture="environment" className="hidden" />
                            <button
                                onClick={() => alert("A função de câmera será ativada em um dispositivo móvel compatível.")}
                                className="flex-1 w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <CameraIcon className="h-5 w-5" />
                                Usar Câmera
                            </button>
                        </div>

                        {bodyPhotoFile && (
                            <button
                                onClick={() => setStep(AppStep.CHOOSE_METHOD)}
                                className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors mt-6"
                            >
                                Avançar
                            </button>
                        )}
                    </div>
                );
            
            case AppStep.CHOOSE_METHOD:
                return (
                    <div className="w-full max-w-md text-center">
                        <BackButton onClick={handleBack} />
                        <h2 className="text-2xl font-bold text-white mb-6">Como você quer criar sua tatuagem?</h2>
                        {bodyPhotoPreview && (
                             <div className="mb-6 opacity-50">
                                <img src={bodyPhotoPreview} alt="Prévia do local" className="rounded-lg max-h-40 mx-auto" />
                            </div>
                        )}
                        <div className="space-y-4">
                             <button
                                onClick={() => setStep(AppStep.UPLOAD_TATTOO_DESIGN)}
                                className="w-full bg-gray-800 text-white py-6 px-4 rounded-lg hover:bg-gray-700 transition-all border border-gray-600 flex flex-col items-center justify-center gap-2"
                            >
                                <UploadIcon className="h-8 w-8 text-indigo-400"/>
                                <span className="font-semibold">Fazer Upload de Tattoo</span>
                                <span className="text-sm text-gray-400">Use uma imagem de tatuagem existente.</span>
                            </button>
                             <button
                                onClick={() => setStep(AppStep.CREATE_TATTOO_WITH_AI)}
                                className="w-full bg-gray-800 text-white py-6 px-4 rounded-lg hover:bg-gray-700 transition-all border border-gray-600 flex flex-col items-center justify-center gap-2"
                            >
                                <WandSparklesIcon className="h-8 w-8 text-indigo-400"/>
                                <span className="font-semibold">Criar Tattoo com I.A.</span>
                                <span className="text-sm text-gray-400">Descreva a tatuagem que você quer.</span>
                            </button>
                        </div>
                    </div>
                );

            case AppStep.UPLOAD_TATTOO_DESIGN:
                return (
                    <div className="w-full max-w-md text-center">
                        <BackButton onClick={handleBack} />
                        <h2 className="text-2xl font-bold text-white mb-6">Faça o upload do design da tatuagem</h2>
                        <div className="flex gap-4 mb-6 justify-center">
                            <img src={bodyPhotoPreview!} alt="Local" className="rounded-lg h-32 w-32 object-cover border-2 border-gray-600"/>
                            {tattooDesignPreview ? (
                                <img src={tattooDesignPreview} alt="Tatuagem" className="rounded-lg h-32 w-32 object-cover border-2 border-indigo-500"/>
                            ) : (
                                <div className="h-32 w-32 bg-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600">
                                    <p className="text-gray-400 text-sm">Tattoo</p>
                                </div>
                            )}
                        </div>

                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={tattooFileInputRef}
                            onChange={(e) => handleFileSelect(e, setTattooDesignFile, setTattooDesignPreview)}
                        />
                         <button
                            onClick={() => tattooFileInputRef.current?.click()}
                            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 mb-6"
                        >
                            <UploadIcon className="h-5 w-5" />
                            Escolher Design
                        </button>
                        <button
                            onClick={handleGeneration}
                            disabled={!tattooDesignFile}
                            className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed enabled:hover:bg-green-700"
                        >
                            Gerar Tatuagem
                        </button>
                    </div>
                );
            
            case AppStep.CREATE_TATTOO_WITH_AI:
                 return (
                    <div className="w-full max-w-md text-center">
                        <BackButton onClick={handleBack} />
                        <h2 className="text-2xl font-bold text-white mb-6">Descreva sua tatuagem</h2>
                         <img src={bodyPhotoPreview!} alt="Local" className="rounded-lg max-h-40 mx-auto mb-6 border-2 border-gray-600"/>
                        <textarea
                            value={tattooPrompt}
                            onChange={(e) => setTattooPrompt(e.target.value)}
                            placeholder="Ex: um leão majestoso com uma coroa, em estilo geométrico com linhas finas"
                            className="w-full bg-gray-800 text-white p-3 rounded-lg h-32 resize-none border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition mb-6"
                        />
                        <button
                            onClick={handleGeneration}
                            disabled={!tattooPrompt.trim()}
                            className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed enabled:hover:bg-green-700"
                        >
                            Gerar Tatuagem
                        </button>
                    </div>
                );

            case AppStep.GENERATING:
                return (
                     <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto"></div>
                        <h2 className="text-2xl font-bold text-white mt-6">Gerando sua tatuagem...</h2>
                        <p className="text-gray-400">A I.A. está trabalhando. Isso pode levar um momento.</p>
                    </div>
                );

            case AppStep.RESULT:
                return (
                    <div className="w-full max-w-lg text-center">
                        {error ? (
                            <>
                                <h2 className="text-2xl font-bold text-red-500 mb-4">Ocorreu um Erro</h2>
                                <p className="text-gray-300 bg-red-900/50 p-4 rounded-lg mb-6">{error}</p>
                            </>
                        ) : (
                            <>
                                <h2 className="text-3xl font-bold text-white mb-6">Sua tatuagem está pronta!</h2>
                                 <img src={finalImage!} alt="Tatuagem gerada" className="rounded-lg shadow-2xl mb-6 w-full"/>
                                 <a
                                    href={finalImage!}
                                    download="minha-tatuagem-ia.jpg"
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    <DownloadIcon className="h-5 w-5"/>
                                    Baixar Imagem
                                </a>
                            </>
                        )}
                         <button
                            onClick={resetState}
                            className="w-full sm:w-auto mt-4 sm:ml-4 inline-flex items-center justify-center gap-2 bg-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            <RefreshCwIcon className="h-5 w-5"/>
                            Começar de Novo
                        </button>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col">
            <Navbar />
            <main className="flex-grow flex flex-col items-center justify-center p-4">
                <div className="relative w-full max-w-lg mx-auto bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/30">
                    {renderStep()}
                </div>
                <footer className="text-center text-gray-500 mt-8 text-sm">
                    <p>Criado com React e Gemini AI</p>
                </footer>
            </main>
        </div>
    );
};

interface BackButtonProps {
    onClick: () => void;
}

const BackButton: React.FC<BackButtonProps> = ({ onClick }) => (
    <button onClick={onClick} className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors z-20">
        <ArrowLeftIcon className="h-6 w-6" />
    </button>
);

export default App;
