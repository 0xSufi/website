import React, { useState, useMemo } from "react";
import {
  Container,
  Box,
  SimpleGrid,
  Heading,
  Text,
  Button,
  HStack,
  VStack,
  Image,
  Input,
  Badge,
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogCloseTrigger,
  DialogTitle,
} from "@chakra-ui/react";
import { isMobile } from "react-device-detect";
import { FaSearch, FaGlobe } from "react-icons/fa";
import { FaXTwitter, FaGithub } from "react-icons/fa6";
import placeholderLogo from "../assets/images/question_white.svg";
import projectsData from "../data/projects.json";

// Blockchain logos - add these to assets
import ethereumLogo from "../assets/images/weth.svg";
import monadLogo from "../assets/images/monad.svg";
import bscLogo from "../assets/images/bnb.png";
import bitcoinLogo from "../assets/images/Bitcoin.svg";

const blockchainLogos: Record<string, string> = {
  "Ethereum": ethereumLogo,
  "Monad": monadLogo,
  "BSC": bscLogo,
  "Bitcoin": bitcoinLogo
};

interface InvestorInfo {
  enabled: boolean;
  type: string; // SAFT, SAFE, etc.
  arrangement: string; // Token, Equity, etc.
  description: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  industries: string[];
  status: string;
  stage?: string; // "Pre-Seed", "Seed", "Series A", "Series B", "Series C"
  logoUrl?: string;
  website?: string;
  twitter?: string;
  github?: string;
  investors?: InvestorInfo | string;
  blockchains?: string[]; // "Ethereum", "Monad", "BSC"
}

const Portfolio: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterIndustry, setFilterIndustry] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [investorProject, setInvestorProject] = useState<Project | null>(null);
  const [isInvestorModalOpen, setIsInvestorModalOpen] = useState(false);
  const gridSize = 4;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const projects: Project[] = projectsData;

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  // Get unique industries and statuses for filters
  const industries = useMemo(() => {
    const unique = [...new Set(projects.flatMap(p => p.industries))];
    return ["all", ...unique];
  }, [projects]);

  const statuses = useMemo(() => {
    const unique = [...new Set(projects.map(p => p.status))];
    return ["all", ...unique];
  }, [projects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (project) =>
          project.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.industries?.some(ind => ind.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply industry filter
    if (filterIndustry !== "all") {
      filtered = filtered.filter(p => p.industries.includes(filterIndustry));
    }

    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    return filtered;
  }, [projects, searchQuery, filterIndustry, filterStatus]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return { label: status, color: "#4ade80", bg: "rgba(74, 222, 128, 0.1)" };
      case "In Development":
        return { label: status, color: "#fbbf24", bg: "rgba(251, 191, 36, 0.1)" };
      case "Completed":
        return { label: status, color: "#60a5fa", bg: "rgba(96, 165, 250, 0.1)" };
      default:
        return { label: status, color: "#888", bg: "rgba(136, 136, 136, 0.1)" };
    }
  };

  return (
    <Container maxW="100%" px={0} py={0} bg="#0a0a0a" minH="100vh" position="relative">
      <Box
        color="white"
        pt="40px"
        pb={8}
        px={isMobile ? 4 : 8}
        maxW="1600px"
        mx="auto"
      >
        {/* Search and Filters */}
        <Box mb={8}>
          <VStack gap={4} align="stretch">
            <Box position="relative" maxW={isMobile ? "100%" : "500px"}>
              <Box
                position="absolute"
                left="12px"
                top="50%"
                transform="translateY(-50%)"
                pointerEvents="none"
                color="#666"
              >
                <FaSearch />
              </Box>
              <Input
                placeholder="Search Projects"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                bg="#1a1a1a"
                border="1px solid #2a2a2a"
                color="white"
                pl="40px"
                _placeholder={{ color: "#666" }}
                _hover={{ borderColor: "#3a3a3a" }}
                _focus={{ borderColor: "#4ade80", boxShadow: "0 0 0 1px #4ade80" }}
              />
            </Box>

            <VStack align="stretch" gap={2}>
              {/* Industry filters */}
              <HStack gap={2} flexWrap="wrap">
                <Box><Text fontSize="sm" color="#888" mr={2}>Industry:</Text></Box>
                <Box>
                {industries.map((industry) => (
                  <Button
                    key={industry}
                    size="sm"
                    onClick={() => setFilterIndustry(industry)}
                    bg={filterIndustry === industry ? "#4ade80" : "transparent"}
                    color={filterIndustry === industry ? "black" : "white"}
                    border="1px solid"
                    borderColor={filterIndustry === industry ? "#4ade80" : "#2a2a2a"}
                    _hover={{
                      bg: filterIndustry === industry ? "#22c55e" : "#1a1a1a",
                    }}
                  >
                    {industry === "all" ? "All" : industry}
                  </Button>
                ))}                  
                </Box>
              </HStack>

              {/* Status filters */}
              <HStack gap={2} flexWrap="wrap">
                <Text fontSize="sm" color="#888" mr={2}>Status:</Text>
                {statuses.map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    onClick={() => setFilterStatus(status)}
                    bg={filterStatus === status ? "#fbbf24" : "transparent"}
                    color={filterStatus === status ? "black" : "white"}
                    border="1px solid"
                    borderColor={filterStatus === status ? "#fbbf24" : "#2a2a2a"}
                    _hover={{
                      bg: filterStatus === status ? "#f59e0b" : "#1a1a1a",
                    }}
                  >
                    {status === "all" ? "All" : status}
                  </Button>
                ))}
              </HStack>
            </VStack>
          </VStack>
        </Box>

        {/* Project Grid */}
        {filteredProjects.length === 0 ? (
          <Box textAlign="center" py={20}>
            <Text color="#666" fontSize="lg">
              No projects found
            </Text>
          </Box>
        ) : (
          <SimpleGrid
            columns={isMobile ? 1 : gridSize}
            gap={4}
          >
            {paginatedProjects.map((project) => {
              const projectLogo = project.logoUrl || placeholderLogo;
              const statusInfo = getStatusColor(project.status);

              return (
                <Box
                  key={project.id}
                  bg="#1a1a1a"
                  border="1px solid #2a2a2a"
                  borderRadius="lg"
                  overflow="hidden"
                  cursor="pointer"
                  transition="all 0.2s"
                  onClick={() => handleProjectClick(project)}
                  _hover={{
                    borderColor: "#4ade80",
                    transform: "translateY(-2px)",
                    boxShadow: "0 4px 12px rgba(74, 222, 128, 0.2)",
                  }}
                >
                  {/* Project Image */}
                  <Box
                    h="120px"
                    bg="#0a0a0a"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    position="relative"
                  >
                    <Image
                      src={projectLogo}
                      alt={project.title}
                      maxH="100px"
                      maxW="100px"
                      objectFit="cover"
                      borderRadius="full"
                    />

                    {/* Status badge */}
                    <VStack
                      position="absolute"
                      top={1}
                      right={1}
                      align="stretch"
                      gap={1}
                      minW="80px"
                    >
                      <Badge
                        bg={statusInfo.bg}
                        color={statusInfo.color}
                        border="1px solid"
                        borderColor={statusInfo.color}
                        px={1.5}
                        py={0.5}
                        borderRadius="sm"
                        fontSize="2xs"
                        fontWeight="600"
                        textAlign="center"
                      >
                        {statusInfo.label}
                      </Badge>
                    </VStack>
                  </Box>

                  {/* Project Info */}
                  <Box p={3} h="210px" display="flex" flexDirection="column">
                    <Box mb={1.5}>
                      <Heading size="sm" color="white" noOfLines={1} fontSize="md" mb={1}>
                        {project.title}
                      </Heading>
                      <HStack gap={1} flexWrap="wrap">
                        {project.industries.map((industry) => (
                          <Box key={industry}>
                            <Text
                              fontSize="2xs"
                              fontWeight="600"
                              color="#4ade80"
                              bg="rgba(74, 222, 128, 0.1)"
                              px={1.5}
                              py={0.5}
                              borderRadius="sm"
                            >
                              {industry}
                            </Text>
                          </Box>
                        ))}
                      </HStack>
                    </Box>

                    <Box mb={2} flex={1} pb={2}>
                      <Text fontSize="xs" color="#888" noOfLines={3}>
                        {project.description || "No description available."}
                      </Text>
                    </Box>

                    {/* Blockchain logos */}
                    {project.blockchains && project.blockchains.length > 0 && (
                      <Box mb={2}>
                        <HStack gap={1}>
                          {project.blockchains.map((chain) => (
                            <Image
                              key={chain}
                              src={blockchainLogos[chain]}
                              alt={chain}
                              w="16px"
                              h="16px"
                              title={chain}
                            />
                          ))}
                        </HStack>
                      </Box>
                    )}

                    {/* Links and Badges */}
                    <HStack gap={2} mt="auto" flexWrap="wrap" mt={2} >
                      {project.website && (
                        <Box
                          as="a"
                          href={project.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          _hover={{ "& svg": { fill: "#4ade80" } }}
                          transition="all 0.2s"
                        >
                          <FaGlobe size={14} color="white" />
                        </Box>
                      )}
                      {project.twitter && (
                        <Box
                          as="a"
                          href={project.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          _hover={{ "& svg": { fill: "#4ade80" } }}
                          transition="all 0.2s"

                        >
                          <FaXTwitter size={14} color="white" />
                        </Box>
                      )}
                      {project.github && (
                        <Box
                          as="a"
                          href={project.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          _hover={{ "& svg": { fill: "#4ade80" } }}
                          transition="all 0.2s"
                        >
                          <FaGithub size={14} color="white" />
                        </Box>
                      )}
                      {project.investors && typeof project.investors === 'object' && project.investors.enabled && (
                        <Badge
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            setInvestorProject(project);
                            setIsInvestorModalOpen(true);
                          }}
                          bg="rgba(167, 139, 250, 0.1)"
                          color="white"
                          border="1px solid #a78bfa"
                          px={2}
                          py={0.5}
                          borderRadius="sm"
                          fontSize="2xs"
                          fontWeight="600"
                          cursor="pointer"
                          _hover={{ bg: "rgba(167, 139, 250, 0.3)" }}
                          transition="all 0.2s"
                          ml="60%"
                        >
                          Investors
                        </Badge>
                      )}
                    </HStack>
                  </Box>
                </Box>
              );
            })}
          </SimpleGrid>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <HStack justify="center" mt={8} gap={2}>
            <Button
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              bg="transparent"
              color="white"
              border="1px solid #2a2a2a"
              _hover={{ bg: "#1a1a1a" }}
              _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
            >
              Previous
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                size="sm"
                onClick={() => handlePageChange(page)}
                bg={currentPage === page ? "#4ade80" : "transparent"}
                color={currentPage === page ? "black" : "white"}
                border="1px solid"
                borderColor={currentPage === page ? "#4ade80" : "#2a2a2a"}
                _hover={{
                  bg: currentPage === page ? "#22c55e" : "#1a1a1a",
                }}
              >
                {page}
              </Button>
            ))}

            <Button
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              bg="transparent"
              color="white"
              border="1px solid #2a2a2a"
              _hover={{ bg: "#1a1a1a" }}
              _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
            >
              Next
            </Button>
          </HStack>
        )}
      </Box>

      {/* Project Details Modal */}
      <DialogRoot open={isModalOpen} onOpenChange={(e) => !e.open && handleCloseModal()}>
        <DialogContent
          bg="#1a1a1a"
          border="1px solid #2a2a2a"
          maxW={isMobile ? "95%" : "500px"}
          position="fixed"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          p={2}
        >
          <DialogHeader>
            <DialogTitle color="white">{selectedProject?.title}</DialogTitle>
            <DialogCloseTrigger />
          </DialogHeader>
          <DialogBody pb={6}>
            {selectedProject && (
              <VStack align="stretch" gap={4}>
                {/* Logo */}
                <Box display="flex" justifyContent="center">
                  <Image
                    src={selectedProject.logoUrl || placeholderLogo}
                    alt={selectedProject.title}
                    maxH="120px"
                    maxW="120px"
                    objectFit="cover"
                    borderRadius="full"
                  />
                </Box>

                {/* Industries & Status */}
                <Box>
                <HStack justify="center" gap={2} flexWrap="wrap">
                  <Box>
                  {selectedProject.industries.map((industry) => (
                    <Box>
                    <Badge
                      key={industry}
                      bg="rgba(74, 222, 128, 0.1)"
                      color="#4ade80"
                      border="1px solid #4ade80"
                      px={2}
                      py={1}
                      borderRadius="sm"
                      fontSize="xs"
                    >
                      {industry}
                    </Badge>                      
                      </Box>
                  ))}                    
                  </Box>
                  <Box>
                  <Badge
                    bg={getStatusColor(selectedProject.status).bg}
                    color={getStatusColor(selectedProject.status).color}
                    border="1px solid"
                    borderColor={getStatusColor(selectedProject.status).color}
                    px={2}
                    py={1}
                    borderRadius="sm"
                    fontSize="xs"
                  >
                    {selectedProject.status}
                  </Badge>                    
                  </Box>
                </HStack>                  
                </Box>

                {/* Description */}
                <Box>
                  <Text color="#888" fontSize="sm" mb={1}>Description</Text>
                  <Text color="white" fontSize="sm">
                    {selectedProject.description || "No description available."}
                  </Text>
                </Box>

                {/* Links */}
                {(selectedProject.website || selectedProject.twitter) && (
                  <HStack justify="center" gap={4}>
                    {selectedProject.website && (
                      <Box
                        as="a"
                        href={selectedProject.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="white"
                        _hover={{ color: "#4ade80", "& svg": { fill: "#4ade80" } }}
                        transition="all 0.2s"
                      >
                        <HStack gap={1}>
                          <FaGlobe size={16} color="white" />
                          <Text fontSize="sm">Website</Text>
                        </HStack>
                      </Box>
                    )}
                    {selectedProject.twitter && (
                      <Box
                        as="a"
                        href={selectedProject.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="white"
                        _hover={{ color: "#4ade80", "& svg": { fill: "#4ade80" } }}
                        transition="all 0.2s"
                      >
                        <HStack gap={1}>
                          <FaXTwitter size={16} color="white" />
                          <Text fontSize="sm">X</Text>
                        </HStack>
                      </Box>
                    )}
                  </HStack>
                )}
              </VStack>
            )}
          </DialogBody>
        </DialogContent>
      </DialogRoot>

      {/* Investor Info Modal */}
      <DialogRoot open={isInvestorModalOpen} onOpenChange={(e) => !e.open && setIsInvestorModalOpen(false)}>
        <DialogContent
          bg="rgba(26, 26, 26, 0.95)"
          border="2px solid #a78bfa"
          maxW={isMobile ? "95%" : "450px"}
          position="fixed"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          boxShadow="0 0 40px rgba(167, 139, 250, 0.3)"
          p={2}
        >
          <DialogHeader>
            <DialogTitle color="white"><Text as="h4">Investment Opportunity</Text></DialogTitle>
            <DialogCloseTrigger />
          </DialogHeader>
          <DialogBody pb={6}>
            {investorProject && typeof investorProject.investors === 'object' && (
              <VStack align="stretch" gap={4}>
                {/* Project Name */}
                <Text color="#a78bfa" fontSize="lg" fontWeight="600" textAlign="center">
                  {investorProject.title}
                </Text>

                {/* Investment Details */}
                <Box bg="rgba(167, 139, 250, 0.1)" p={4} borderRadius="md" border="1px solid rgba(167, 139, 250, 0.3)">
                  <VStack align="stretch" gap={3}>
                    {investorProject.stage && (
                      <HStack justify="space-between">
                        <Text color="#888" fontSize="sm">Stage</Text>
                        <Badge
                          bg="rgba(56, 189, 248, 0.2)"
                          color="#38bdf8"
                          px={2}
                          py={1}
                          borderRadius="sm"
                          fontSize="xs"
                          fontWeight="600"
                        >
                          {investorProject.stage}
                        </Badge>
                      </HStack>
                    )}
                    <HStack justify="space-between">
                      <Text color="#888" fontSize="sm">Agreement Type</Text>
                      <Badge
                        bg="rgba(167, 139, 250, 0.2)"
                        color="white"
                        px={2}
                        py={1}
                        borderRadius="sm"
                        fontSize="xs"
                        fontWeight="600"
                      >
                        {investorProject.investors.type}
                      </Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color="#888" fontSize="sm">Arrangement</Text>
                      <Badge
                        bg="rgba(74, 222, 128, 0.2)"
                        color="#4ade80"
                        px={2}
                        py={1}
                        borderRadius="sm"
                        fontSize="xs"
                        fontWeight="600"
                      >
                        {investorProject.investors.arrangement}
                      </Badge>
                    </HStack>
                  </VStack>
                </Box>

                {/* Description */}
                <Box>
                  <Text color="#888" fontSize="sm" mb={2}>Details</Text>
                  <Text color="white" fontSize="sm" lineHeight="1.6">
                    {investorProject.investors.description}
                  </Text>
                </Box>

                {/* Contact Button */}
                <Button
                  bg="#a78bfa"
                  color="white"
                  _hover={{ bg: "#8b5cf6" }}
                  size="sm"
                  mt={2}
                >
                  Contact for Details
                </Button>
              </VStack>
            )}
          </DialogBody>
        </DialogContent>
      </DialogRoot>
    </Container>
  );
};

export default Portfolio;
