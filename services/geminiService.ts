
import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";

// Obter a API key da variável de ambiente Vite
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("API key do Gemini não encontrada! Por favor, defina VITE_GEMINI_API_KEY no arquivo .env");
  throw new Error("VITE_GEMINI_API_KEY não está configurada");
}

const ai = new GoogleGenAI({ apiKey });

const fileToGenerativePart = async (file: File): Promise<Part> => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const base64ToGenerativePart = (base64: string, mimeType: string): Part => {
  return {
    inlineData: { data: base64, mimeType: mimeType },
  };
};

const generateDetailedPromptForImagen = async (parts: Part[]): Promise<string> => {
  let modelPrompt: string;
  let finalPartsForPromptGen = [...parts];

  const userPromptPart = parts.find(p => 'text' in p);
  const userPrompt = userPromptPart && 'text' in userPromptPart ? userPromptPart.text : '';

  if (userPrompt) { // Body photo + text prompt
      modelPrompt = `Você é um engenheiro de prompts especialista em IA de geração de imagem. Sua tarefa é criar um prompt detalhado e de alta fidelidade em INGLÊS para o modelo Imagen 3. Você receberá uma imagem (uma foto de uma parte do corpo) e uma descrição em texto de uma tatuagem.

Seu prompt gerado DEVE instruir a IA a realizar uma operação de "in-painting" (pintura interna) realista. Isso significa:
1. A imagem final DEVE usar a imagem fornecida (a parte do corpo) como fundo original e inalterado.
2. Todos os detalhes da imagem (tom de pele, textura, pelos, iluminação, sombras, ambiente de fundo) devem ser perfeitamente preservados.
3. Uma nova tatuagem, baseada na descrição do texto do usuário, deve ser gerada e colocada de forma realista na parte do corpo na imagem.
4. A tatuagem deve parecer que está na pele, adaptando-se às curvas e contornos do corpo.
5. A descrição em texto para a tatuagem é: '${userPrompt}'.

Estrutura de exemplo para sua saída:
"Photorealistic in-painting. The base image is a [detailed description of the body part photo, including lighting and skin]. Realistically generate and apply a tattoo described as '${userPrompt}' onto the specified body part. Do not change the base image, only add the tattoo."

Agora, analise a imagem a seguir e o prompt do usuário para gerar o prompt perfeito para o Imagen.`;
      // filter out text part before sending to model
      finalPartsForPromptGen = parts.filter(p => !('text' in p));
  } else { // Body photo + tattoo design
      modelPrompt = `Você é um engenheiro de prompts especialista em IA de geração de imagem. Sua tarefa é criar um prompt detalhado e de alta fidelidade em INGLÊS para o modelo Imagen 3. Você receberá duas imagens: a primeira é uma foto de uma parte do corpo e a segunda é um desenho de tatuagem.

Seu prompt gerado DEVE instruir a IA a realizar uma operação de "in-painting" (pintura interna) realista. Isso significa:
1. A imagem final DEVE usar a primeira imagem (a parte do corpo) como fundo original e inalterado.
2. Todos os detalhes da primeira imagem (tom de pele, textura, pelos, iluminação, sombras, ambiente de fundo) devem ser perfeitamente preservados.
3. A tatuagem da segunda imagem deve ser realisticamente colocada na parte do corpo da primeira imagem. O design e as cores da tatuagem devem ser replicados exatamente.
4. A tatuagem deve parecer que está na pele, adaptando-se às curvas e contornos do corpo.
5. O prompt deve descrever claramente a parte do corpo e o design da tatuagem para guiar a IA.

Estrutura de exemplo para sua saída:
"Photorealistic in-painting. The base image is a [detailed description of the body part photo, including lighting and skin]. Realistically apply the tattoo from the second image, which is [detailed description of the tattoo design], onto the specified body part. Do not change the base image, only add the exact tattoo design."

Agora, analise as duas imagens a seguir e gere o prompt perfeito.`;
  }

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-04-17',
    contents: { parts: [{text: modelPrompt}, ...finalPartsForPromptGen] },
    config: { thinkingConfig: { thinkingBudget: 0 } }
  });

  return response.text;
};

const generateImageWithImagen = async (prompt: string): Promise<string> => {
  const response = await ai.models.generateImages({
    model: 'imagen-3.0-generate-002',
    prompt: prompt,
    config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
  });
  
  if (response.generatedImages && response.generatedImages.length > 0) {
    return response.generatedImages[0].image.imageBytes;
  }
  throw new Error("A IA não conseguiu gerar uma imagem.");
};

export const generateTattooFromUpload = async (bodyPhotoFile: File, tattooDesignFile: File): Promise<string> => {
  const bodyPart = await fileToGenerativePart(bodyPhotoFile);
  const tattooPart = await fileToGenerativePart(tattooDesignFile);
  
  const imagenPrompt = await generateDetailedPromptForImagen([bodyPart, tattooPart]);
  return await generateImageWithImagen(imagenPrompt);
};

export const generateTattooFromPrompt = async (bodyPhotoFile: File, tattooPrompt: string): Promise<string> => {
  const bodyPart = await fileToGenerativePart(bodyPhotoFile);
  const textPart: Part = { text: tattooPrompt };

  const imagenPrompt = await generateDetailedPromptForImagen([bodyPart, textPart]);
  return await generateImageWithImagen(imagenPrompt);
};
