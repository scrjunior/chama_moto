-- CreateTable
CREATE TABLE `Passageiro` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(191) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Passageiro_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Viagem` (
    `id` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDENTE', 'ACEITA', 'REJEITADA', 'CONCLUIDA', 'CANCELADA') NOT NULL DEFAULT 'PENDENTE',
    `origemTexto` VARCHAR(191) NOT NULL,
    `destinoTexto` VARCHAR(191) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `passageiroId` VARCHAR(191) NOT NULL,
    `taxistaId` VARCHAR(191) NOT NULL,

    INDEX `Viagem_passageiroId_idx`(`passageiroId`),
    INDEX `Viagem_taxistaId_idx`(`taxistaId`),
    INDEX `Viagem_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Viagem` ADD CONSTRAINT `Viagem_passageiroId_fkey` FOREIGN KEY (`passageiroId`) REFERENCES `Passageiro`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Viagem` ADD CONSTRAINT `Viagem_taxistaId_fkey` FOREIGN KEY (`taxistaId`) REFERENCES `Taxista`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
