import React from "react";
import {
  Container,
  Box,
  SimpleGrid,
  Heading,
  Text,
  HStack,
  VStack,
  Image,
} from "@chakra-ui/react";
import { isMobile } from "react-device-detect";
import { FaXTwitter, FaLinkedin, FaGithub } from "react-icons/fa6";
import placeholderAvatar from "../assets/images/question_white.svg";
import teamData from "../data/team.json";

// Import team avatars
import internAvatar from "../assets/images/intern.jpeg";

// Map avatar names to imported images
const avatarMap: Record<string, string> = {
  "intern": internAvatar,
};

// Helper to get avatar image
const getAvatar = (avatarKey: string | undefined) => {
  if (!avatarKey) return placeholderAvatar;
  return avatarMap[avatarKey] || placeholderAvatar;
};

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatar?: string;
  twitter?: string;
  linkedin?: string;
  github?: string;
}

const teamMembers: TeamMember[] = teamData;

const Team: React.FC = () => {
  return (
    <Container maxW="100%" px={0} py={0} bg="#0a0a0a" minH="100vh" position="relative">
      <Box
        color="white"
        pt="40px"
        pb={8}
        px={isMobile ? 4 : 8}
        maxW="1200px"
        mx="auto"
      >
        {/* Header */}
        <Box mb={8} textAlign="center">
          <Heading size="xl" color="white" mb={2}>
            Our Team
          </Heading>
          <Text color="#888" fontSize="md">
            Meet the people building the future of decentralized finance
          </Text>
        </Box>

        {/* Team Grid */}
        <SimpleGrid
          columns={isMobile ? 1 : 4}
          gap={4}
        >
          {teamMembers.map((member) => (
            <Box
              key={member.id}
              bg="#1a1a1a"
              border="1px solid #2a2a2a"
              borderRadius="lg"
              overflow="hidden"
              transition="all 0.2s"
              _hover={{
                borderColor: "#4ade80",
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(74, 222, 128, 0.2)",
              }}
            >
              {/* Profile Picture */}
              <Box
                h="120px"
                bg="#0a0a0a"
                display="flex"
                alignItems="center"
                justifyContent="center"
                position="relative"
              >
                <Image
                  src={getAvatar(member.avatar)}
                  alt={member.name}
                  maxH="100px"
                  maxW="100px"
                  objectFit="cover"
                  borderRadius="full"
                  border="2px solid #2a2a2a"
                />
              </Box>

              {/* Member Info */}
              <Box p={3} h="180px" display="flex" flexDirection="column">
                <Box mb={1.5}>
                  <Heading size="sm" color="white" noOfLines={1} fontSize="md" textAlign="center">
                    {member.name}
                  </Heading>
                </Box>

                <Box mb={2}>
                  <Text
                    fontSize="2xs"
                    fontWeight="600"
                    color="#4ade80"
                    bg="rgba(74, 222, 128, 0.1)"
                    px={2}
                    py={0.5}
                    borderRadius="sm"
                    textAlign="center"
                  >
                    {member.role}
                  </Text>
                </Box>

                <Box mb={2} flex={1}>
                  <Text fontSize="xs" color="#888" noOfLines={3} textAlign="center">
                    {member.bio}
                  </Text>
                </Box>

                {/* Social Links */}
                <Box>
                  <HStack gap={3} justify="center" mt="auto">
                    {member.twitter && (
                      <Box
                        as="a"
                        href={member.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="white"
                        _hover={{ color: "#4ade80" }}
                        transition="all 0.2s"
                      >
                        <FaXTwitter size={14} />
                      </Box>
                    )}
                    {member.linkedin && (
                      <Box
                        as="a"
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="white"
                        _hover={{ color: "#4ade80" }}
                        transition="all 0.2s"
                      >
                        <FaLinkedin size={14} />
                      </Box>
                    )}
                    {member.github && (
                      <Box
                        as="a"
                        href={member.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="white"
                        _hover={{ color: "#4ade80" }}
                        transition="all 0.2s"
                      >
                        <FaGithub size={14} />
                      </Box>
                    )}
                  </HStack>
                </Box>
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      </Box>
    </Container>
  );
};

export default Team;
